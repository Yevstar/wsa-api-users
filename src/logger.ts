import winston from "winston";
import WinstonCloudWatch from "winston-cloudwatch";
import stringify from 'safe-stable-stringify';

// TO-FIX: Although this can be supplied while executing the node process,
// with the current deployment model, this needs to be hard set here to
// be 'local' while debugging any of the stages locally (hopefully this
// will be fixed through the unified deployment model)
const NODE_ENV = process.env.NODE_ENV || 'local';

// Based on the values set in Winston Cloudwatch library source
const MAX_EVENT_MSG_SIZE_BYTES = 256000;
const BASE_EVENT_SIZE_BYTES = 26;

const { createLogger, transports, format } = winston;
const { combine, splat, json, colorize, timestamp, printf } = format;

const logger = createLogger({
  format: json(),
  transports: [],
  exitOnError: false,
});

function loggerConfig() {
  if (NODE_ENV === 'local') {
    const consoleTransport = new transports.Console({
      format: combine(
        colorize(),
        splat(),
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        printf( ({ level, message, timestamp, ...metadata}) => `${timestamp} [${level}] : ${message} ${metadata && JSON.stringify(metadata)}` )
      )
    });

    return logger.add(consoleTransport);
  }

  const cloudWatchConfig = {
    level: process.env.LOG_LEVEL,
    logGroupName: process.env.CLOUDWATCH_GROUP_NAME,
    logStreamName: process.env.CLOUDWATCH_STREAM_NAME,
    awsAccessKeyId: process.env.CLOUDWATCH_ACCESS_KEY_ID,
    awsSecretKey: process.env.CLOUDWATCH_SECRET_ACCESS_KEY,
    awsRegion: process.env.CLOUDWATCH_REGION,
    // jsonMessage: true, // messageFormatter will not be used if this option is set to true (not documented in winston cloudwatch)
  };

  const cloudWatchTransport = new WinstonCloudWatch({
    ...cloudWatchConfig,
    messageFormatter: (item: any) => {
      const msg = stringify(item);
      // NOTE: Doing the exact same test that Winston Cloudwatch seems to be doing internally
      //       so as to stop the recursive logging of insanely large messages
      const msgSize = Buffer.byteLength(msg, 'utf8');
      if ((msgSize + BASE_EVENT_SIZE_BYTES) >= MAX_EVENT_MSG_SIZE_BYTES) {
        return `Truncated due to the size of message (${msgSize} bytes) ${msg.substring(0, MAX_EVENT_MSG_SIZE_BYTES / 2)}`;
      }
      return msg;
    }
  });

  return logger.add(cloudWatchTransport);
}

function wrapConsole() {
  console.log = (message?: any, ...optionalParams: any[]): void => {
    logger.info(message, ...optionalParams);
  };
  console.error = (message?: any, ...optionalParams: any[]): void => {
    // Temporary ditching this annoying error.
    if (message !== 'Ignoring invalid configuration option passed to Connection: acquireTimeout. ' +
      'This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass ' +
      'an invalid configuration options to a Connection') {
      logger.error(message, ...optionalParams);
    }
  };
  console.warn = (message?: any, ...optionalParams: any[]): void => {
    logger.warn(message, ...optionalParams);
  };
}

export {
  logger,
  loggerConfig,
  wrapConsole,
};
