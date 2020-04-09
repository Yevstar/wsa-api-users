INSERT INTO wsa_users.role (id, name, description, applicableToWeb) values (14, 'event_invitee', 'Event invitee', 0);

insert into `wsa_users`.`function` (id, name) values (27, 'event_recipient');

insert into `wsa_users`.`functionRole` (roleId, functionId) values (3, 27);
insert into `wsa_users`.`functionRole` (roleId, functionId) values (8, 27);
insert into `wsa_users`.`functionRole` (roleId, functionId) values (9, 27);
