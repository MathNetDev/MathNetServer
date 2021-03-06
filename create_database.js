"use strict";
/**
 * Creates the main database using names declared in config_database.js
 */

var mysql = require('mysql');
var dbconfig = require('./config_database');
var connection = mysql.createConnection(dbconfig.connection);
connection.connect();

connection.query('CREATE DATABASE IF NOT EXISTS ' + dbconfig.database + ';');

connection.query('SET foreign_key_checks = 0;');

/********************************** Admins *************************************************/
connection.query('\
                 CREATE TABLE IF NOT EXISTS `' + dbconfig.database + '`.`' + dbconfig.admin_table + '` ( \
                 `admin_id` INT AUTO_INCREMENT, \
                 `user_name` VARCHAR(40) NOT NULL, \
                 `password` VARCHAR(1000) NOT NULL, \
                 `date_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
                 PRIMARY KEY (`admin_id`) \
                 )');


/********************************** Classes *************************************************/
connection.query('\
                 CREATE TABLE IF NOT EXISTS `' + dbconfig.database + '`.`' + dbconfig.class_table + '` ( \
                 `class_id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
                 `admin_id` INT, \
                 `hashed_id` VARCHAR(8), \
                 `class_name` VARCHAR(40) NOT NULL, \
                 `date_create` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
                 PRIMARY KEY (`class_id`), \
                 UNIQUE INDEX `id_UNIQUE` (`class_id` ASC), \
                 UNIQUE INDEX `class_name` (`class_name` ASC), \
                 FOREIGN KEY (`admin_id`) REFERENCES `' + dbconfig.database + '`.`' + dbconfig.admin_table + '`(admin_id) \
                 ON DELETE CASCADE \
                 )');


/********************************** Groups *************************************************/
connection.query('\
                 CREATE TABLE IF NOT EXISTS `' + dbconfig.database + '`.`' + dbconfig.group_table + '` ( \
                 `group_id` INT UNSIGNED NOT NULL, \
                 `class_id` INT UNSIGNED NOT NULL, \
                 `date_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
                 `group_color` VARCHAR(40),\
                 PRIMARY KEY (`group_id`, `class_id`), \
                 FOREIGN KEY (`class_id`) REFERENCES `'+ dbconfig.database +'`.`'+dbconfig.class_table+'`(class_id) \
                 ON DELETE CASCADE \
                 )');

/********************************** ToolBars *************************************************/
connection.query('\
                 CREATE TABLE IF NOT EXISTS `' + dbconfig.database + '`.`' + dbconfig.toolbar_table + '` ( \
                 `toolbar_id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
                 `toolbar_name` VARCHAR(40) NOT NULL, \
                 `tools` VARCHAR(100) NOT NULL, \
                 `admin_id` INT NOT NULL, \
                 `date_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
                 PRIMARY KEY (`toolbar_id`), \
                 FOREIGN KEY (`admin_id`) REFERENCES `'+ dbconfig.database +'`.`'+dbconfig.admin_table+'`(admin_id) \
                 ON DELETE CASCADE \
                 )');

/********************************** XMLs *************************************************/
connection.query('\
                 CREATE TABLE IF NOT EXISTS `' + dbconfig.database + '`.`' + dbconfig.xml_table + '` ( \
                 `xml_id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
                 `xml_name` VARCHAR(40) NOT NULL, \
                 `xml` TEXT NOT NULL, \
                 `toolbar` VARCHAR(320) NOT NULL, \
                 `admin_id` INT NOT NULL, \
                 `date_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
                 PRIMARY KEY (`xml_id`), \
                 FOREIGN KEY (`admin_id`) REFERENCES `'+ dbconfig.database +'`.`'+dbconfig.admin_table+'`(admin_id) \
                 ON DELETE CASCADE \
                 )');

/********************************** Sessions *************************************************/
connection.query('\
                 CREATE TABLE IF NOT EXISTS `' + dbconfig.database + '`.`' + dbconfig.session_table + '` ( \
                 `session_id` INT AUTO_INCREMENT, \
                 `admin_id` INT, \
                 `password` VARCHAR(1000) NOT NULL, \
                 `date_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
                 `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
                 PRIMARY KEY (`session_id`), \
                 FOREIGN KEY (`admin_id`) REFERENCES `' + dbconfig.database + '`.`' + dbconfig.admin_table + '`(admin_id) \
                 ON DELETE CASCADE \
                 )');

/********************************** Logs *************************************************/
connection.query('\
                 CREATE TABLE IF NOT EXISTS `' + dbconfig.database + '`.`' + dbconfig.log_table + '` ( \
                 `log_id` INT AUTO_INCREMENT, \
                 `student_name` VARCHAR(200) NOT NULL, \
                 `log` VARCHAR(1000) NOT NULL, \
                 `date_created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
                 `class_id` VARCHAR(40) NOT NULL, \
                 `group_id` INT, \
                 PRIMARY KEY (`log_id`) \
                 )');

connection.query('SET foreign_key_checks = 1;');

console.log('Success: Database Created!')

connection.end();
