"use strict";
var classes = require('./available_classes');
var socketio = require('socket.io');
var database = require('./database_actions');
var hash = require('./hashes');
var pw = require('secure-password');

// Q allows use of promises. 
// First, a promise is deferred.
// Then it is either rejected with an error message or  resolved with any that 
// needs to be returned.
var Q = require("q");

var logger = require('./logger_create');  
module.exports = server_sockets;

// Takes a class id and username.
// If invalid, returns an error.
// If valid, a new user entry is created for the class in the global 
// datastructure.
function add_user_to_class(username, class_id) {
    var deferred = Q.defer();
    
    if (username === "") {
        deferred.reject('Invalid username.');
        return deferred.promise;
    }

    if (class_id in classes.available_classes) {
        if (!(username in classes.available_classes[class_id]["user"])) {
            classes.available_classes[class_id]["user"][username] = {};
            classes.available_classes[class_id]["user"][username]["info"] = "";
            deferred.resolve();
        }
        else {
            deferred.reject('Username ' + username + ' is already taken.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }

    return deferred.promise;
}

// Takes a class id and username.
// If invalid, returns an error.
// If valid, the given user is deleted from the class in the global 
// datastructure.
function remove_user_from_class(username, class_id) {
    var deferred = Q.defer();
    
    if (class_id in classes.available_classes) {
        if (username in classes.available_classes[class_id]["user"]) {
            delete classes.available_classes[class_id]["user"][username]; 
            deferred.resolve();
        }
        else {
            deferred.reject('Username ' + username + ' is invalid.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }

    return deferred.promise;
}

// Takes a class id.
// If invalid, returns an error.
// If valid, a JSON string of all groups and their contents in the class is 
// returned. The data is retrieved from the global datastructure.
function get_all_groups_from_class(class_id) {
    var deferred = Q.defer();
    if (class_id in classes.available_classes) {
        var groups = [];
        for (var i in classes.available_classes[class_id]){
            if (i != "user" && i != "class_name" && i != "settings"){
                groups.push({
                    grp_name : i,
                    num : classes.available_classes[class_id][i]["students"].length
                });
            }
        }

        deferred.resolve(groups);
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }

    return deferred.promise;
}

// Takes a username, class id, and group id.
// If invalid, returns an error.
// If valid, a new user entry is created for the class group in the global 
// datastructure.
function add_user_to_group(username, class_id, group_id) {
    var deferred = Q.defer();

    if (class_id in classes.available_classes) {
        if (group_id in classes.available_classes[class_id]) {
            if (username in classes.available_classes[class_id]["user"]) {
                classes.available_classes[class_id][group_id]["students"].push(username);
                var info = {};
                var charges = [{name: username, x: 0, y: 0}];
                info.charges = charges;
                classes.available_classes[class_id]["user"][username]["info"] = JSON.stringify(info);

                deferred.resolve();
            }
            else {
                deferred.reject('Username ' + username + ' is invalid.');
            }
        }
        else {
            deferred.reject('Group ID ' + group_id + ' is invalid.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }

    return deferred.promise;
}

// Takes a username, class id, and group id.
// If invalid, returns an error.
// If valid, the given user is deleted from the class group in the global
// datastructure.
function remove_user_from_group(username, class_id, group_id) {
    var deferred = Q.defer();
    
    if (class_id in classes.available_classes) {
        if (group_id in classes.available_classes[class_id]) {
            if (username in classes.available_classes[class_id]["user"]) {
                var index = classes.available_classes[class_id][group_id]["students"].indexOf(username);

                if (index > -1) {
                    classes.available_classes[class_id][group_id]["students"].splice(index, 1);
                    classes.available_classes[class_id]["user"][username]["info"] = "{}";
                    deferred.resolve();
                }
                else {
                    deferred.reject('Username ' + username + ' is invalid.');
                }

            }
            else {
                deferred.reject('Username ' + username + ' is invalid.');
            }
        }
        else {
            deferred.reject('Group ID ' + group_id + ' is invalid.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }

    return deferred.promise;
}

// Takes a class id and group id
// If invalid, returns an error.
// If valid, a JSON string of all users and their contents in the class group
// is returned. The data is retrieved from the global datastructure.
function get_info_of_group(class_id, group_id) {
    var deferred = Q.defer();
    var other_members = [];
    
    if (class_id in classes.available_classes) {
        if (group_id in classes.available_classes[class_id]) {
            for (var i in classes.available_classes[class_id][group_id]["students"]) {
                var student_name = classes.available_classes[class_id][group_id]["students"][i];
                other_members.push({
                    member_name : student_name,
                    member_info : classes.available_classes[class_id]["user"][student_name]["info"],
                    group_id : group_id
                });
            }
            deferred.resolve(other_members);
        }
        else {
            deferred.reject('Group ID ' + group_id + ' is invalid.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }
    
    return deferred.promise;
}

// Takes a username, class id, and x,y coordinates movements.
// If invalid, returns an error.
// If valid, a JSON string of the given user's new updated coordinates is 
// returned. The data is updated in the global datastructure.
function update_users_coordinates(username, class_id, info) {
    var deferred = Q.defer();

    if (class_id in classes.available_classes) {
        if (username in classes.available_classes[class_id]["user"]) {

            if(info == null || info == ""){
                classes.available_classes[class_id]["user"][username]["info"] = "{}";
            } else {
                classes.available_classes[class_id]["user"][username]["info"] = JSON.stringify(info);
            }

            var data = {
                info : classes.available_classes[class_id]["user"][username]["info"] 
            }

            deferred.resolve(data);
        }
        else {
            deferred.reject('Username ' + username + ' is invalid.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }
    return deferred.promise;
}

//takes a username, class_id, group_id, and xml string
//if invalid, errors
//if valid stores xml string for group in user and group xml object
function update_user_xml(username, class_id, group_id, xml, toolbar) {
    var deferred = Q.defer();

    if (class_id in classes.available_classes) {
        if (group_id in classes.available_classes[class_id]) {
            if (username in classes.available_classes[class_id]["user"] || username == "admin") {
                classes.available_classes[class_id][group_id]["xml"] = JSON.stringify(xml);
                classes.available_classes[class_id][group_id]["toolbar"] = toolbar;
                var data = {
                    xml: classes.available_classes[class_id][group_id]["xml"],
                    toolbar: classes.available_classes[class_id][group_id]["toolbar"] 
                }
                deferred.resolve(data);
            }
            else {
                deferred.reject('Username ' + username + ' is invalid.');
            }
        } 
        else {
            deferred.reject('Group ID ' + group_id + ' is invalid.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }
    return deferred.promise;
}

//takes a username, class_id, and group_id
//if invalid, returns an error
//if valid, returns JSON of class data to user
//this is returned from the global datastructure
function get_user_xml(username, class_id, group_id) {
    var deferred = Q.defer();

    if (class_id in classes.available_classes) {
        if (group_id in classes.available_classes[class_id]) {
            if (username in classes.available_classes[class_id]["user"] || username == "admin") {
                var xml = classes.available_classes[class_id][group_id]["xml"];
                var toolbar = classes.available_classes[class_id][group_id]["toolbar"];
                var data = {
                    xml: xml,
                    toolbar: toolbar
                }
                deferred.resolve(data);
            }
            else {
                deferred.reject('Username ' + username + ' is invalid.');
            }
        } 
        else {
            deferred.reject('Group ID ' + group_id + ' is invalid.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }
    return deferred.promise;
}

// Takes a class id
// If invalid, returns an error.
// If valid, a JSON string of the class settings is returned. The data is 
// retrieved from the global datastructure.
function get_settings(class_id, group_id) {
    var deferred = Q.defer();
    if (class_id in classes.available_classes) {
        if (group_id in classes.available_classes[class_id]) {
            var settings = classes.available_classes[class_id]['settings'];
            deferred.resolve(settings);
        }
        else {
            deferred.reject('Group ID ' + group_id + ' is invalid.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }

    return deferred.promise;
}

// Takes a class name and group count.
// If invalid, returns an error.
// If valid, create a class of the given class name in the database and return
// a hashed string of the created class id. A new class entry is also made in 
// the global datastructure.
function create_class(class_name, group_count, admin_id){
    var deferred = Q.defer();

    database.create_class(class_name, group_count, admin_id)
    .then(function(class_id) {
        return hash.add_hash(class_id);
    }).then(function(id_hash) {
        classes.available_classes[id_hash] = {};
        for(var i=0; i<group_count; i++) {
            classes.available_classes[id_hash][i+1] = {students:[], deleted:false};
        }
        classes.available_classes[id_hash]['user'] = {};
        classes.available_classes[id_hash]['settings'] = {};
        classes.available_classes[id_hash]['class_name'] = class_name;
        deferred.resolve(id_hash);
    })
    .fail(function(error) {
        deferred.reject(error);  
    });
   
    return deferred.promise;
}

// Takes a class id.
// If invalid, returns an error.
// If valid, retrieve class name and group count from global datastructure.
function join_class(class_id) {
    var deferred = Q.defer();

    if (class_id in classes.available_classes) {
        var group_count = Object.keys(classes.available_classes[class_id]).length - 3;
        var class_name = classes.available_classes[class_id]['class_name'];

        var data = {
            group_count: group_count,
            class_name: class_name
        }
        deferred.resolve(data);
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }

    return deferred.promise;
}

// Takes a class id.
// If invalid, returns an error.
// If valid, create a group for the given class in the database and return all
// the groups in the class. A new group entry for the class is also made in the
// global datastructure.
function create_group(class_id) {
    var deferred = Q.defer();

    hash.find_id(class_id)
    .then(function(unhashed_id) {
        return database.create_group(unhashed_id);
    }).then(function(group_id) {
        classes.available_classes[class_id][group_id] = {students:[], deleted:false};
        return get_all_groups_from_class(class_id);
    }).then(function(groups) {
        deferred.resolve(groups);
    }).fail(function(error) {
        deferred.reject(error);      
    });

    return deferred.promise;
}

// Takes a class id, toolbar_name and tools.
// If invalid, returns an error.
// If valid, create a toolbar for the given class in the database and return all
// the toolbars in the class.
function create_toolbar(class_id, toolbar_name, tools) {
    var deferred = Q.defer();

    hash.find_id(class_id)
    .then(function(unhashed_id) {
        database.create_toolbar(unhashed_id, toolbar_name, tools);
        return hash.find_id(class_id);
    }).then(function(unhashed_id) {
        return database.get_toolbars(unhashed_id);
    }).then(function(toolbars) {
        deferred.resolve(toolbars);
    }).fail(function(error) {
        deferred.reject(error);      
    });

    return deferred.promise;
}


// Takes a username and password.
// If invalid, returns an error.
// If valid return all
// creates admin.

function create_admin(username, password) {
    var deferred = Q.defer();

console.log("in create-admin");
    database.create_user(username, password)
    .then(function(admin) {
        
        deferred.resolve(admin);
    }).fail(function(admin) {
        deferred.reject(error);
    });


    return deferred.promise;
}


// Takes a class id.
// If invalid, returns an error.
// If valid return all
// the toolbars in the class.

function get_toolbars(class_id) {
    var deferred = Q.defer();

    hash.find_id(class_id)
    .then(function(unhashed_id) {
        return database.get_toolbars(unhashed_id);
    }).then(function(toolbars) {
        deferred.resolve(toolbars);
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
}

// Takes username and get password

function check_username(username) {
    var deferred = Q.defer();

    database.check_user(username)
    .then(function(data_password) {
        deferred.resolve(data_password);
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
}


// Takes admin_id and get session string

function check_session(admin_id) {
    var deferred = Q.defer();

    database.check_session(admin_id)
    .then(function(data_password) {
        deferred.resolve(data_password);
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
}

// Takes an admin id.
// If invalid, returns an error.
// If valid create session.

function create_session(admin_id, password) {
    var deferred = Q.defer();

    database.create_session(admin_id, password)
    .then(function() {
        deferred.resolve();
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
}

// Takes an admin id.
// If invalid, returns an error.
// If valid delete session.

function delete_session(admin_id) {
    var deferred = Q.defer();

    database.delete_session(admin_id)
    .then(function() {
        deferred.resolve();
    }).fail(function(error) {
        deferred.reject(error);
    });

    return deferred.promise;
}

// If invalid, returns an error.
// If valid, deletes the toolbar for the given class in the database and return all
// the toolbars in the class.
function delete_toolbar(class_id, toolbar_name) {
    var deferred = Q.defer();

    hash.find_id(class_id)
    .then(function(unhashed_id) {
        database.delete_toolbar(unhashed_id, toolbar_name);
        return hash.find_id(class_id);
    }).then(function(unhashed_id) {
        return database.get_toolbars(unhashed_id);
    }).then(function(toolbars) {
        deferred.resolve(toolbars);
    }).fail(function(error) {
        deferred.reject(error);      
    });

    return deferred.promise;
}

// Takes a class id and group id.
// If invalid, returns an error.
// If valid, deletes the given group in the class from the database and global
// datastructure.
function delete_group(class_id, group_id) {
    var deferred = Q.defer();

    hash.find_id(class_id)
    .then(function(unhashed_id) {
        return database.delete_group(unhashed_id, group_id);
    }).then(function() {
        delete classes.available_classes[class_id][group_id];
    }).then(function(groups) {
        deferred.resolve(groups);
    }).fail(function(error) {
        deferred.reject(error);
    });
          return deferred.promise;
}

// Takes a class id.
// If invalid, returns an error.
// If valid, deletes the given class from the global datastructure.
function leave_class(class_id) {
    var deferred = Q.defer();

//    hash.remove_hash(class_id)
//    .then(function() {
//        deferred.resolve();
//    }).fail(function(error) {
//        deferred.reject(error);
//    });
    if (class_id in classes.available_classes) {
        deferred.resolve();
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }
  
    return deferred.promise;
}

// Takes a class id.
// If invalid, returns an error.
// If valid, deletes the given class from the global datastructure.
function delete_class(class_id) {
    var deferred = Q.defer();

    hash.find_id(class_id)
    .then(function(unhashed_id) {
        return database.delete_class(unhashed_id);
    }).then(function() {
        delete classes.available_classes[class_id];
        deferred.resolve();
    }).fail(function(error) {
        deferred.reject(error);
    });
          return deferred.promise;
}



// Takes no parameters
// Retrieves the list of all classes from the database
// On failure, returns error.
function get_classes(admin_id){
    var deferred = Q.defer();

    database.get_classes(admin_id)
    .then(function(classes){
        deferred.resolve(classes);
    }).fail(function(error){
        deferred.reject(error);
    });
        return deferred.promise;

}

// Takes a class id and settings data.
// If invalid, returns an error.
// If valid, adds the settings to the given class in the global datastructure.
function save_settings(class_id, settings) {
    var deferred = Q.defer();

   if (class_id in classes.available_classes) {
        classes.available_classes[class_id]['settings'] = settings;
        deferred.resolve();
    }
    else {
        deferred.reject('Class ID ' + class_id + ' is invalid.');
    }

    return deferred.promise;
}

// Sanitizes data received by socket to prevent 
function sanitize_data(data) {
    // Replace only works on string variables
    if (typeof data === 'string' || data instanceof String) {
        return data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    else {
        return data;
    }
}

// This function holds all event handlers for sockets.
function server_sockets(server, client){

    var io = socketio.listen(server);
   
    io.on('connection', function(socket) {

        // SERVER_ERROR
        // This function will notify the client when an error has occurred 
        // Emits server_error to the socket that triggered the error
        function server_error(error, message) {
            console.log(error);
            var date = new Date().toJSON();
            logger.info(date + "~server~server_error~~~{message: \""+ message +"\"}~0~");
            socket.emit('server_error', {message: message});
        };

        // LOGIN
        // Socket joins room using class id
        // Emits login_response to socket that triggered login
        socket.on('login', function(username, class_id) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            
            add_user_to_class(username, class_id)
            .then(function() {
                socket.class_id = class_id;
                socket.username = username;

                var response = {
                    username : username,
                    class_id : class_id 
                }
                var date = new Date().toJSON();
                logger.info(date + "~" + username + "~login~" + class_id +"~~" + JSON.stringify(response) + "~1~");
                socket.emit('login_response', response);
            }).fail(function(error) {
                server_error(error, error); 
            });
        }); // authenticates class ID and makes sure there is not another user 
        //     with the same name. adds in user info to datastructure if unique.
        //     else displays an error message

        // LOGOUT
        // Socket leaves room using class id
        // Emits logout_response to socket that triggered logout
        socket.on('logout', function(username, class_id, disconnect) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            disconnect = sanitize_data(disconnect);
            
            remove_user_from_class(username, class_id)
            .then(function() { 
                socket.leave(class_id + "x");
                var response = {
                    username : username,
                    class_id : class_id,
                    disconnect: disconnect
                }
                var date = new Date().toJSON();
                logger.info(date + "~" + username + "~logout~" + class_id + "~~~1~");
                socket.emit('logout_response', response);
                socket.class_id = undefined;
                socket.username = undefined;
            }).fail(function(error) {
                server_error(error, error);
            });
        }); 

        // GROUPS_GET
        // Emits groups_get_response to all sockets in class room
        socket.on('groups_get', function(username, class_id) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            
            get_all_groups_from_class(class_id)
            .then(function(groups) {
                socket.join(class_id + 'x');
                var response = {
                    username : username,
                    class_id : class_id,
                    groups : groups
                }
                socket.emit('groups_get_response', response);
            }).fail(function(error) {
                server_error(error, error);
            });
        }); // populates groups array with groups with the given class id and 
        //     returns it to client.

        // GROUP_JOIN
        // Socket joins room using class and group ids
        // Emits group_join_response to socket that triggered group_join
        // Emits group_info_response to the admin socket of class
        // Emits group_numbers_response to all sockets in class room
        socket.on('group_join', function(username, class_id, group_id) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            group_id = sanitize_data(group_id);

            add_user_to_group(username, class_id, group_id)
            .then(function() { 
                socket.join(class_id + "x" + group_id);
               // socket.leave(class_id + "x");
                socket.group_id = group_id;

                var info = {};
                info.charges = [{name: username, x: 0, y: 0}];
                var response = {
                    username : username,
                    class_id : class_id,
                    group_id : group_id,
                    other_members : [{member_name: username, member_info: JSON.stringify(info), group_id: group_id}],
                    status : true,
                    group_size : classes.available_classes[class_id][group_id]["students"].length
                }
                var date = new Date().toJSON();
                logger.info(date + "~" + username + "~group_join~" + class_id + "~" + group_id + "~" + JSON.stringify(response)
                            + "~1~" +class_id + "x");
                socket.emit('group_join_response', response);
                io.sockets.to(class_id + "x").emit('group_numbers_response', response);
                io.sockets.to('admin-' + class_id).emit('group_info_response', response);
            }).fail(function(error) {
                server_error(error, error);
            });
        }); // adds user to the students array of given group

        // GROUP_LEAVE
        // Socket leaves room using class and group ids
        // Emits group_leave_response to socket that triggered group_leave
        // Emits group_info_response to all sockets in the class group room and
        // to the admin socket of the class
        // Emits group_numbers_response to all sockets in class room
        socket.on('group_leave', function(username, class_id, group_id, disconnect) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            group_id = sanitize_data(group_id);
            disconnect = sanitize_data(disconnect);
            
            remove_user_from_group(username, class_id, group_id)
            .then(function() {
              //  socket.join(class_id + "x");
                socket.leave(class_id + 'x' + group_id);
                var response = {
                    username : username,
                    class_id : class_id,
                    group_id : group_id,
                    status: false,
                    disconnect: disconnect,
                    group_size : classes.available_classes[class_id][group_id]["students"].length
                }
                var date = new Date().toJSON();
                logger.info(date + "~" + username + "~group_leave~" + class_id + "~" + group_id + "~" 
                            + JSON.stringify(response) + "~1~" +class_id + "x" + group_id );
                socket.emit('group_leave_response', response);
                io.sockets.to(class_id + "x").emit('group_numbers_response', response)
                io.sockets.to(class_id + "x" + group_id).emit('group_info_response', response);
                io.sockets.to('admin-' + class_id).emit('group_info_response', response);
                socket.group_id = undefined;
            }).fail(function(error) {
                server_error(error, error);
            });
        }); // resets user coordinates and removes them from the students array
        //     in current group, leaves your socket group

        // GROUP_INFO
        // Socket joins two rooms using class id and group id
        // Emits group_info_response to all sockets in the class group room and
        // to the admin socket of the class
        socket.on('group_info', function(username, class_id, group_id, status) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            group_id = sanitize_data(group_id);
            status = sanitize_data(status);

            get_info_of_group(class_id, group_id)
            .then(function(other_members) {
                var response = {
                    username : username,
                    class_id : class_id,
                    group_id : group_id,
                    other_members : other_members,
                    status: status
                }
                if(status){
                    socket.emit('group_info_response', response); 
                } //don't need to emit if the person is leaving 
                response['other_members'] = [{
                    member_name : username,
                    member_info : classes.available_classes[class_id]["user"][username]["info"],
                    group_id : group_id
                }]; //set other_members to just the new member for the other group members
                socket.broadcast.to(class_id + "x"+ group_id).emit('group_info_response', response);
                //io.sockets.to('admin-' + class_id).emit('group_info_response', response);
            }).fail(function(error) {
                server_error(error, error);
            });
        }); // populates array other_members with the other students and their 
        //     coordinates in the given group 

        // COORDINATE_CHANGE
        // Emits coordinate_change_response to all sockets in the class group 
        // room
        // Emits group_info_response to admin socket of the class
        socket.on('coordinate_change', function(username, class_id, group_id, info) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            group_id = sanitize_data(group_id);
            info = sanitize_data(info);
            
            var response;

            update_users_coordinates(username, class_id, info)
            .then(function(data) {
                response = {
                    username : username,
                    class_id : class_id,
                    group_id : group_id,
                    info: data.info
                }
                return get_info_of_group(class_id, group_id);
            }).then(function(other_members) {
                response.other_members = other_members;
                var date = new Date().toJSON();
                logger.info(date + "~" + username + "~coordinate_change~" + class_id + "~" + group_id + "~" 
                            + JSON.stringify(response)  + "~1~" + class_id + "x" + group_id );
                io.sockets.to(class_id + "x" + group_id).emit('coordinate_change_response', response);
                io.sockets.to('admin-' + class_id).emit('coordinate_change_response', response);
            }).fail(function(error) {
                server_error(error, error);
            });
        }); //registers the change of coordinates in the datastructure and passes them back to group

        // XML_CHANGE
        // emits xml_change_response to all sockets in the group room
        socket.on('xml_change', function(username, class_id, group_id, xml, toolbar) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            group_id = sanitize_data(group_id);
            xml = sanitize_data(xml);
            toolbar = sanitize_data(toolbar);
            
            update_user_xml(username, class_id, group_id, xml, toolbar)
            .then(function(data){
                var response = {
                    username: username,
                    class_id: class_id,
                    group_id: group_id,
                    xml: data.xml,
                    toolbar: data.toolbar
                }
                var date = new Date().toJSON();
                logger.info(date + "~" + username + "~xml_change~" + class_id + "~" + group_id + "~" 
                            + JSON.stringify(response)  + "~1~" + class_id + "x" + group_id );
                socket.broadcast.to(class_id + "x" + group_id).emit('xml_change_response', response);
                io.sockets.to('admin-' + class_id).emit('xml_change_response', response);
            }).fail(function(error){
                server_error(error, error);
            });
        }); //updates user and group xml values in the datastructure 

        // GET_XML
        // emits get_xml_response to socket that requested it.
        socket.on('get_xml', function(username, class_id, group_id) {
            username = sanitize_data(username);
            class_id = sanitize_data(class_id);
            group_id = sanitize_data(group_id);
            
            get_user_xml(username, class_id, group_id)
            .then(function(data){
                var response = {
                    username: username,
                    class_id: class_id,
                    group_id: group_id,
                    xml: data.xml,
                    toolbar: data.toolbar
                }
                var date = new Date().toJSON();
                logger.info(date + "~" + username + "~get_xml~" + class_id + "~" + group_id + "~" 
                            + JSON.stringify(response)  + "~0~" + class_id + "x" + group_id );
                socket.emit('get_xml_response', response);
            }).fail(function(error){
                server_error(error, error);
            });
        }); //gets class xml and returns it to the socket that joined the group

        // GET-SETTINGS
        // This is the handler for the get-settings client socket emission
        // Emits get-settings-response to all sockets in the class group room
        socket.on('get-settings', function(class_id, group_id) {
            class_id = sanitize_data(class_id);
            group_id = sanitize_data(group_id);

            get_settings(class_id, group_id)
            .then(function(settings) {
                var response = {
                    class_id : class_id,
                    settings : settings
                }
                var date = new Date().toJSON();
                logger.info(date + "~ADMIN~get-settings~~~" + JSON.stringify(response) + "~0~");
                io.sockets.to(class_id + "x" + group_id).emit('get-settings-response', response);
            }).fail(function(error) {
                server_error(error, error);
            });
        });
       
        // ADD-CLASS
        // This is the handler for the add-class client socket emission
        // It calls a database function to create a class and groups
        // Socket joins an admin room using class id
        // Emits add-class-response to the socket that triggered add-class 
        socket.on('add-class', function(class_name, group_count, secret, admin_id) {
            class_name = sanitize_data(class_name);
            group_count = sanitize_data(group_count);
            secret = sanitize_data(secret);
            console.log(admin_id);

            if (secret == "ucd_247") {
                create_class(class_name, group_count, admin_id)
                .then(function(class_id) {
                    socket.join('admin-' + class_id);
                    var response = {
                        class_id : class_id,
                        class_name : class_name,
                        group_count : group_count
                    }
                    var date = new Date().toJSON();
                    logger.info(date + "~ADMIN~add-class~" + class_name + "~~{class_id:"+ class_name + "}~1~");
                    socket.emit('add-class-response', response);
                }).fail(function(error) {
                    server_error(error, error);
                });
            }
        });

        //CREATE-SESSION
        //This is the handler for create session socket emission
        //It calls the database function to put the admin in the database
        socket.on('create-session', function(admin_id, string) {
            var password = pw.makePassword(string, 10, 'sha256', 32);

            
            create_session(admin_id, password)
            .then(function() {

            }).fail(function(error) {
                    server_error(error, error);
                });
            socket.admin_id = admin_id;
        });

        //DELETE-SESSION
        //This is the handler for delete session socket emission
        //It calls the database function delete the admin from the database
        socket.on('delete-session', function(admin_id) {
       
            delete_session(admin_id)
            .then(function() {

            }).fail(function(error) {
                    server_error(error, error);
                });
        });


        // CREATE-ADMIN
        // This is the handler for the create-admin client socket emission
        // It calls a database function to create an admin
        // Socket joins an admin room using class id
        // Emits create-admin-response to the socket that triggered add-class 
        socket.on('create-admin', function(username, password, secret) {
            username = sanitize_data(username);
            password = pw.makePassword(password, 10, 'sha256', 32);
            

            if (secret == "ucd_247") {
                
                check_username(username) // checking if username already exists or not
                .then(function(data_password) {
                    
                    if (!data_password[0]) { // not calling database function create admin if username already exists

                        create_admin(username, password)
                        .then(function(data) {


                            var response = {
                                username: username,
                                password: password,
                                check : 1
                            }
                            
                            var date = new Date().toJSON();
                            logger.info(date + "~ADMIN~create-admin~" + username + "~~{class_id:"+ username + "}~1~");
                            socket.emit('create-admin-response', response);

                        }).fail(function(error){
                            server_error(error, error);
                        });

                    }

                else {
                    var response = {
                        check : 0
                    }
                    socket.emit('create-admin-response', response);
                }
                }).fail(function(error) {
                    server_error(error, error);
                });
            }
        });


        // JOIN-CLASS
        // This is the handler for the join-class client socket emission
        // It calls a function to get the number of groups in the class from 
        // the global datastructure.
        // Emits add-class-response to the socket that triggered join-class
        socket.on('join-class', function(class_id, secret) {
            class_id = sanitize_data(class_id);
            secret = sanitize_data(secret);

            if (secret == "ucd_247") {
                join_class(class_id)
                .then(function(data) {
                    socket.join('admin-' + class_id);
                    var response = {
                        class_id : class_id,
                        class_name : data.class_name,
                        group_count : data.group_count
                    }
                    var date = new Date().toJSON();
                    logger.info(date + "~ADMIN~join-class~" + class_id + "~~" + JSON.stringify(response) + "~0~");
                    socket.emit('add-class-response', response);
                    for(var i = 1; i < data.group_count+1; i++){
                        get_info_of_group(class_id, i)
                        .then(function(other_members){
                            if(other_members != undefined && other_members.length != 0){
                               var response = {
                                    other_members: other_members,
                                    group_id: other_members[0].group_id,
                                    status: true
                                }
                                io.sockets.to('admin-' + class_id).emit('group_info_response', response);
                            }
                        });
                    }
                }).fail(function(error) {
                    server_error(error, error);
                });
            }
        });

        // ADD-GROUP
        // This is the handler for the add-group client socket emission
        // It calls a database function to create a group for a class
        // Emits add-group-response to socket that triggered add-group
        // Emits groups_get_response to all sockets in the class room
        socket.on('add-group', function(class_id, secret) {
            class_id = sanitize_data(class_id);
            secret = sanitize_data(secret);


            if (secret == "ucd_247") {
                create_group(class_id)
                .then(function(groups) {
                    var response = {
                        username : "Admin",
                        class_id : class_id,
                        groups : groups
                    }
                    var date = new Date().toJSON();
                    logger.info(date + "~ADMIN~add-group~" + class_id + "~" + groups.length + "~" + JSON.stringify(response) 
                                + "~1~"+ class_id + "x");
                    socket.emit('add-group-response', {});
                    io.sockets.to(class_id + "x").emit('add-group-response', {});

                }).fail(function(error) {
                    server_error(error, error);
                });
            }
        }); 


        // ADD-TOOLBAR
        // This is the handler for the add-toolbar client socket emission
        // It calls a database function to create a toolbar for a class
        // Emits toolbar_get_response to all sockets in the class room
        socket.on('save-toolbar', function(class_id, toolbar_name, tools) {
            class_id = sanitize_data(class_id);

            create_toolbar(class_id, toolbar_name, tools)
            .then(function(toolbars) {

                var response = {
                    username : "Admin",
                    class_id : class_id,
                    toolbars : toolbars
                }
                //console.log(response);
                var date = new Date().toJSON();
                logger.info(date + "~ADMIN~add-toolbar~" + class_id + "~" + toolbars.length + "~" + JSON.stringify(response) 
                            + "~1~"+ class_id + "x");
                socket.emit('get-toolbar-response', response);
                io.sockets.to("admin-" + class_id).emit('get-toolbar-response', response);

            }).fail(function(error) {
                server_error(error, error);
            });

        }); 

        // GET-TOOLBARS
        // This is the handler for the get-toolbar client socket emission
        // It calls a database function to get all the toolbars for a class
        // Emits get_toolbar_response to all sockets in the class room
        socket.on('get-toolbars', function(class_id) {
            class_id = sanitize_data(class_id);

            get_toolbars(class_id)
            .then(function(toolbars) {

                var response = {
                    username : "Admin",
                    class_id : class_id,
                    toolbars : toolbars
                }
                //console.log(response);
                socket.emit('get-toolbar-response', response);
                io.sockets.to("admin-" + class_id).emit('get-toolbar-response', response);

            }).fail(function(error) {
                server_error(error, error);
            });

        }); 

        // DELETE-TOOLBAR
        // This is the handler for the delete-toolbar client socket emission
        // It calls a database function to delete the toolbar for the class
        // Emits delete_toolbar_response to all sockets in the class room
        socket.on('delete-toolbar', function(class_id, toolbar_name) {
            class_id = sanitize_data(class_id);

            console.log("delete-toolbar");
            delete_toolbar(class_id, toolbar_name)
            .then(function(toolbars) {

                var response = {
                    username : "Admin",
                    class_id : class_id,
                    toolbars : toolbars
                }
                //socket.emit('delete-toolbar-response', response);
                io.sockets.to("admin-" + class_id).emit('delete-toolbar-response', response);
                //socket.emit('get-toolbar-response', response);
                //io.sockets.to("admin-" + class_id).emit('get-toolbar-response', response);

            }).fail(function(error) {
                server_error(error, error);
            });

        }); 

        // DELETE-GROUP
        // This is the handler for the delete-group client socket emission
        // It calls a database function to delete a group for a class
        // Emits delete-group-response to socket that triggered delete-group
        // Emits group_leave_response to all sockets in class group room
        // Emits groups_get_response to all sockets in class room
        socket.on('delete-group', function(class_id, group_id, secret) {
            class_id = sanitize_data(class_id);
            group_id = sanitize_data(group_id);
            secret = sanitize_data(secret); 
            
            if (secret == "ucd_247") {
                delete_group(class_id, group_id)
                .then(function(groups) {
                    var response = {
                        username : "Admin",
                        class_id : class_id,
                        group_id : group_id,
                        groups : groups
                    }

                    var date = new Date().toJSON();
                    logger.info(date + "~ADMIN~delete-group~" + class_id + "~" + group_id + "~" 
                                + JSON.stringify(response) + "~1~[" + class_id + "x," + class_id + "x" + group_id + "]");
                    socket.emit('delete-group-response', {});
                    
                    io.sockets.to(class_id + "x" + group_id).emit('group_leave_response', response);
                    io.sockets.to(class_id + "x").emit('delete-group-response', {});
                }).fail(function(error) {
                    server_error(error, error);
                });
            }
        });

        // LEAVE-CLASS
        // This is the handler for the leave-class client socket emission
        // Socket leaves an admin room using class id
        // Emits leave-class-response to socket that triggered leave-classs
        // Emits logout_response to all sockets in class room
        socket.on('leave-class', function(class_id, secret, disconnect) {
            class_id = sanitize_data(class_id);
            secret = sanitize_data(secret);
            
            if (secret == "ucd_247") {
                leave_class(class_id)
                .then(function() {
                    socket.leave('admin-' + class_id);
                    var date = new Date().toJSON();
                    var response = {
                        disconnect: disconnect
                    }
                    logger.info(date + "~ADMIN~leave-class~" + class_id + "~~"+ JSON.stringify(response) + "~0~");
                    socket.emit('leave-class-response', response);
                   // io.to(class_id + "x").emit('logout_response', {});
                }).fail(function(error) {
                    server_error(error);
                });
            }
        });

        // DELETE-CLASS
        // This is the handler for the delete-class client socket emission
        // Socket deletes an admin room using class id
        // Emits delete-leave-class-response to socket that triggered leave-classs
        // Emits logout_response to all sockets in class room
        socket.on('delete-class', function(class_id, secret, disconnect) {
            class_id = sanitize_data(class_id);
            var length = Object.keys(classes.available_classes[class_id]).length;
            
            if (secret == "ucd_247") {
                delete_class(class_id)
                .then(function() {
                    
                    var response = 
                    {
                        class_id : class_id,
                        disconnect: disconnect,
                    }
                    
                    for (var i = 1; i <= length - 3; i++) {
                        socket.to(class_id + "x" + i).emit('group_leave_response', response);
                        socket.to(class_id + "x" + i).emit('logout_response', response);
                    }  // going through all the groups one by one

                    io.sockets.to("admin-" + class_id).emit('leave-class-response', response);
                    io.sockets.to("admin-" + class_id).emit('delete-class-response', response);
                    io.sockets.emit('delete-student-class-response', response);
                    io.sockets.to(class_id + "x").emit('logout_response', response);
                    hash.remove_hash(class_id);

                }).fail(function(error){
                    server_error(error);
                });

            }

            
        });


        // GET-CLASSES
        // This is the handler for the get-classes socket emission
        // Returns list of classes and their hashed IDs from the database
        // to the client via a get-classes-response
        socket.on('get-classes', function(secret, admin_id, disconnect) {
            secret = sanitize_data(secret);
            
            if (secret == "ucd_247") {
                get_classes(admin_id)
                .then(function(classes) {
                    
                    //console.log(classes);
                    var date = new Date().toJSON();
                    var response = {
                        secret: secret,
                        disconnect: disconnect,
                        classes: classes
                    }

                    logger.info(date + "~ADMIN~get-classes~" + "no_class" + "~~"+ JSON.stringify(response) + "~0~");
                    socket.emit('get-classes-response', response);
                   // io.to(class_id + "x").emit('logout_response', {});
                }).fail(function(error) {
                    server_error(error);
                });
            }
        });

        // CHECK-USERNAME
        // This is the handler for the check_username socket emission
        socket.on('check-username', function(username, password, secret) {
            secret = sanitize_data(secret);
            username = sanitize_data(username);
            password = sanitize_data(password);
            console.log("hello");

            if (secret == "ucd_247") {
                check_username(username)
                .then(function(data_password) {
                    var check = 0;
                    
                    if(!data_password[0])
                       {
                        check = 0;
                        var data_admin = "nothing"
                       } 
                    else if(!pw.verifyPassword(password, data_password[0].password))
                        {
                            check = -1;
                            var data_admin =  data_password[0].admin_id;
                        }
                    else
                        {
                            check = 1;
                            var data_admin =  data_password[0].admin_id;
                            
                        }

                    socket.emit('check-username-response', data_admin, check);
                   // io.to(class_id + "x").emit('logout_response', {});
                }).fail(function(error) {
                    server_error(error);
                });
            }
        });

        // CHECK-SESSION
        // This is the handler for the check_session socket emission
        socket.on('check-session', function(admin_id, password) {
            admin_id = sanitize_data(admin_id);
            password = sanitize_data(password);

            check_session(admin_id)
            .then(function(data_password) {
                var check = 0;
                var data_admin = 0;
                
                if(password && data_password[0] && pw.verifyPassword(password, data_password[0].password))
                    {
                        check = 1;
                        data_admin = admin_id;
                        socket.admin_id = admin_id;
                    }
                if(data_password[0] && (Math.abs(new Date() - data_password[0].last_updated) >= 720000) && check == 1)
                    check = -1;

                console.log(new Date() - data_password[0].last_updated);

                socket.emit('check-session-response', data_admin, check);
               // io.to(class_id + "x").emit('logout_response', {});
            }).fail(function(error) {
                server_error(error);
            });

        });




        // SAVE-SETTINGS
        // This is the handler for the save-settings client socket emission
        // Emits get-settings-response to all sockets in class room
        socket.on('save-settings', function(class_id, settings, secret) {
            class_id = sanitize_data(class_id);
            settings = sanitize_data(settings);
            secret = sanitize_data(secret);
            
            if (secret == "ucd_247") {
                save_settings(class_id, settings)
                .then(function() {
                    var response = {
                        class_id : class_id,
                        settings : settings
                    }
                    var date = new Date().toJSON();
                    logger.info(date + "~ADMIN~save-settings~~~" + JSON.stringify(response) + "~1~");

                    for (var i = 1; i <= Object.keys(classes.available_classes[class_id]).length - 3; i++) {
                        socket.to(class_id + "x" + i).emit('get-settings-response', response);
                    }
                }).fail(function(error) {
                    server_error(error);
                });
            }
        });

        // DISCONNECT
        // This is the handler for any disconnects, it checks if the disconnected socket has
        // any variables within it set, and if still set, removes the user from the groups on the server side
        // emitting group_info response to the group (if in one) room and admin, and logout_response to the individual socket.
        socket.on('disconnect', function() {

            if (socket.admin_id){
                console.log("refersh page");

                database.update_time(socket.admin_id)
                .then(function() {
                    deferred.resolve();
                }).fail(function(error) {
                    deferred.reject(error);
                });
            }
            
            
            // Remove user from class
            if (socket.class_id !== undefined) {

                // Remove user from group
                if (socket.group_id !== undefined) {
                    remove_user_from_group(socket.username, socket.class_id, socket.group_id)
                    .then(function() {
                        return get_info_of_group(socket.class_id, socket.group_id)
                    }).then(function(other_members) {
                        socket.leave(socket.class_id + "x" + socket.group_id);
                        var response = {
                            username : socket.username,
                            class_id : socket.class_id,
                            group_id : socket.group_id,
                            disconnect : true,
                            status: false,
                            other_members : other_members
                        }

                        var date = new Date().toJSON();
                        logger.info(date + "~" + socket.username + 
                                    "~group_leave~" + socket.class_id + "~" + 
                                    socket.group_id + "~" + 
                                    JSON.stringify(response) + "~1~" + 
                                    socket.class_id + "x" + socket.group_id);

                                    io.sockets.to(socket.class_id + "x" +
                                                  socket.group_id)
                                    .emit('group_info_response', response);
                                    
                                    io.sockets.to('admin-' + 
                                                  socket.class_id)
                                    .emit('group_info_response', response);
                    }).fail(function(error) {
                        server_error(error, error);
                    });

                }

                remove_user_from_class(socket.username, socket.class_id)
                .then(function() { 
                    var response = {
                        username : socket.username,
                        class_id : socket.class_id,
                        disconnect : true
                    }

                    var date = new Date().toJSON();
                    logger.info(date + "~" + socket.username + "~logout~" +
                                socket.class_id + "~~~1~");
                    socket.emit('logout_response', response);
                }).fail(function(error) {
                    server_error(error, error);
                });
            }
        });
    });
}