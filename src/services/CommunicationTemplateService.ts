import { Service } from 'typedi';
import BaseService from './BaseService';
import { CommunicationTemplate } from '../models/CommunicationTemplate';

@Service()
export default class CommunicationTemplateService extends BaseService<CommunicationTemplate> {
  modelName(): string {
    return CommunicationTemplate.name;
  }
}
