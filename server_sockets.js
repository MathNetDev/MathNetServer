var classes = require('./available_classes');
var socketio = require('socket.io');
var database = require('./database_actions');
var hash = require('./hashes');

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
   
    if (username === "" || class_id === "") {
        deferred.reject('Invalid class ID or username.');
        return deferred.promise;
    }

    if (class_id in classes.available_classes) {
        if (!(username in classes.available_classes[class_id]["user"])) {
            classes.available_classes[class_id]["user"][username] = {};
            classes.available_classes[class_id]["user"][username]["x"] = 0.0;
            classes.available_classes[class_id]["user"][username]["y"] = 0.0;
            classes.available_classes[class_id]["user"][username]["info"] = "";
            deferred.resolve();
        }
        else {
            deferred.reject('Username ' + username + ' is already taken.');
        }
    }
    else {
        deferred.reject('Class ID ' + class_id + ' does not exist.');
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
                classes.available_classes[class_id]["user"][username]["x"] = 0.0;
                classes.available_classes[class_id]["user"][username]["y"] = 0.0;
                classes.available_classes[class_id]["user"][username]["info"] = "";

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
                    classes.available_classes[class_id]["user"][username]["x"] = 0.0;
                    classes.available_classes[class_id]["user"][username]["y"] = 0.0;
                    classes.available_classes[class_id]["user"][username]["info"] = "";
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
                    member_x : classes.available_classes[class_id]["user"][student_name]["x"], 
                    member_y : classes.available_classes[class_id]["user"][student_name]["y"],
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
function update_users_coordinates(username, class_id, x, y, info) {
    var deferred = Q.defer();

    if (class_id in classes.available_classes) {
        if (username in classes.available_classes[class_id]["user"]) {
            if (!isNaN(x) && !isNaN(y)) {
                classes.available_classes[class_id]["user"][username]["x"] += x;
                classes.available_classes[class_id]["user"][username]["y"] += y;
                classes.available_classes[class_id]["user"][username]["info"] = JSON.stringify(info);

                var data = {
                    x : classes.available_classes[class_id]["user"][username]["x"], 
                    y : classes.available_classes[class_id]["user"][username]["y"],
                    info : classes.available_classes[class_id]["user"][username]["info"] 
                }

                deferred.resolve(data);
            }
            else {
                deferred.reject('Coordinate shift (' + x + ', ' + y + ') is invalid.');
            }
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
function create_class(class_name, group_count){
    var deferred = Q.defer();

    database.create_class(class_name, group_count)
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
        deferred.reject('Class ID ' + class_id + ' does not exist.');
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
        return get_all_groups_from_class(class_id);
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
        deferred.reject('Class ID ' + class_id + ' does not exist.');
    }
  
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
        deferred.reject('Class ID ' + class_id + ' does not exist.');
    }

    return deferred.promise;
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
            date = new Date().toJSON();
            logger.info(date + "~server~server_error~~~{message: \""+ message +"\"}~0~");
            socket.emit('server_error', {message: message});
        };

        // LOGIN
        // Socket joins room using class id
        // Emits login_response to socket that triggered login
        socket.on('login', function(username, class_id) {
            add_user_to_class(username, class_id)
            .then(function() {
                socket.class_id = class_id;
                socket.username = username;

                var response = {
                    username : username,
                    class_id : class_id 
                }
                date = new Date().toJSON();
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
        socket.on('logout', function(username, class_id) {
            remove_user_from_class(username, class_id)
            .then(function() { 
                socket.leave(class_id + "x");
                var response = {
                    username : username,
                    class_id : class_id
                }
                date = new Date().toJSON();
                logger.info(date + "~" + username + "~logout~" + class_id + "~~~1~");
                socket.emit('logout_response', {});
                socket.class_id = undefined;
                socket.username = undefined;
            }).fail(function(error) {
                server_error(error, error);
            });
        }); 

        // GROUPS_GET
        // Emits groups_get_response to all sockets in class room
        socket.on('groups_get', function(username, class_id) {
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
        // Emits groups_get_response to all sockets in the class room
        // Emits group_info_response to the admin socket of class
        socket.on('group_join', function(username, class_id, group_id) {
            add_user_to_group(username, class_id, group_id)
            .then(function() { 
                socket.join(class_id + "x" + group_id);
               // socket.leave(class_id + "x");
                socket.group_id = group_id;

                var response = {
                    username : username,
                    class_id : class_id,
                    group_id : group_id,
                    other_members : [{member_name: username, member_x: 0, member_y: 0, member_info: null, group_id: group_id}],
                    status : true,
                    group_size : classes.available_classes[class_id][group_id]["students"].length
                }
                date = new Date().toJSON();
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
        socket.on('group_leave', function(username, class_id, group_id) {
            remove_user_from_group(username, class_id, group_id)
            .then(function() {
              //  socket.join(class_id + "x");
                socket.leave(class_id + 'x' + group_id);
                var response = {
                    username : username,
                    class_id : class_id,
                    group_id : group_id,
                    status: false,
                    group_size : classes.available_classes[class_id][group_id]["students"].length
                }
                date = new Date().toJSON();
                logger.info(date + "~" + username + "~group_leave~" + class_id + "~" + group_id + "~" 
                            + JSON.stringify(response) + "~1~" +class_id + "x" + group_id );
                socket.emit('group_leave_response', response);
                io.sockets.to(class_id + "x").emit('group_numbers_response', response)
                io.sockets.to(class_id + "x" + group_id).emit('group_info_response');
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
                    member_x : classes.available_classes[class_id]["user"][username]["x"], 
                    member_y : classes.available_classes[class_id]["user"][username]["y"],
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
        socket.on('coordinate_change', function(username, class_id, group_id, x, y, info) {
            var response;
            update_users_coordinates(username, class_id, x, y, info)
            .then(function(data) {
                response = {
                    username : username,
                    class_id : class_id,
                    group_id : group_id,
                    x : data.x,
                    y : data.y,
                    info: data.info
                }
                return get_info_of_group(class_id, group_id);
            }).then(function(other_members) {
                response.other_members = other_members;
                date = new Date().toJSON();
                logger.info(date + "~" + username + "~coordinate_change~" + class_id + "~" + group_id + "~" 
                            + JSON.stringify(response)  + "~1~" + class_id + "x" + group_id );
                io.sockets.to(class_id + "x" + group_id).emit('coordinate_change_response', response);
                io.sockets.to('admin-' + class_id).emit('coordinate_change_response', response);
            }).fail(function(error) {
                server_error(error, error);
            });
        }); //registers the change of coordinates in the datastructure and passes them back to group

        // GET-SETTINGS
        // This is the handler for the get-settings client socket emission
        // Emits get-settings-response to all sockets in the class group room
        socket.on('get-settings', function(class_id, group_id) {
            get_settings(class_id, group_id)
            .then(function(settings) {
                var response = {
                    class_id : class_id,
                    settings : settings
                }
                date = new Date().toJSON();
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
        socket.on('add-class', function(class_name, group_count, secret) {
            if (secret == "ucd_247") {
                create_class(class_name, group_count)
                .then(function(class_id) {
                    socket.join('admin-' + class_id);
                    var response = {
                        class_id : class_id,
                        class_name : class_name,
                        group_count : group_count
                    }
                    date = new Date().toJSON();
                    logger.info(date + "~ADMIN~add-class~" + class_name + "~~{class_id:"+ class_name + "}~1~");
                    socket.emit('add-class-response', response);
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
            if (secret == "ucd_247") {
                join_class(class_id)
                .then(function(data) {
                    socket.join('admin-' + class_id);
                    var response = {
                        class_id : class_id,
                        class_name : data.class_name,
                        group_count : data.group_count
                    }
                    date = new Date().toJSON();
                    logger.info(date + "~ADMIN~join-class~" + class_id + "~~" + JSON.stringify(response) + "~0~");
                    socket.emit('add-class-response', response);
                    for(i = 1; i < data.group_count+1; i++){
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
            if (secret == "ucd_247") {
                create_group(class_id)
                .then(function(groups) {
                    var response = {
                        username : "Admin",
                        class_id : class_id,
                        groups : groups
                    }
                    date = new Date().toJSON();
                    logger.info(date + "~ADMIN~add-group~" + class_id + "~" + groups.length + "~" + JSON.stringify(response) 
                                + "~1~"+ class_id + "x");
                    socket.emit('add-group-response', {});
                    io.sockets.to(class_id + "x").emit('add-group-response', {});

                }).fail(function(error) {
                    server_error(error, error);
                });
            }
        }); 

        // DELETE-GROUP
        // This is the handler for the delete-group client socket emission
        // It calls a database function to delete a group for a class
        // Emits delete-group-response to socket that triggered delete-group
        // Emits group_leave_response to all sockets in class group room
        // Emits groups_get_response to all sockets in class room
        socket.on('delete-group', function(class_id, group_id, secret) {
            if (secret == "ucd_247") {
                delete_group(class_id, group_id)
                .then(function(groups) {
                    var response = {
                        username : "Admin",
                        class_id : class_id,
                        group_id : group_id,
                        groups : groups
                    }
                    date = new Date().toJSON();
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
        socket.on('leave-class', function(class_id, secret) {
            if (secret == "ucd_247") {
                leave_class(class_id)
                .then(function() {
                    socket.leave('admin-' + class_id);
                    date = new Date().toJSON();
                    logger.info(date + "~ADMIN~leave-class~" + class_id + "~~~0~");
                    socket.emit('leave-class-response', {});
                   // io.to(class_id + "x").emit('logout_response', {});
                }).fail(function(error) {
                    server_error(error);
                });
            }
        });

        // SAVE-SETTINGS
        // This is the handler for the save-settings client socket emission
        // Emits get-settings-response to all sockets in class room
        socket.on('save-settings', function(class_id, settings, secret) {
            if (secret == "ucd_247") {
                save_settings(class_id, settings)
                .then(function() {
                    var response = {
                        class_id : class_id,
                        settings : settings
                    }
                    date = new Date().toJSON();
                    logger.info(date + "~ADMIN~save-settings~~~" + JSON.stringify(response) + "~1~");

                    for (var i = 1; i <= Object.keys(classes.available_classes[class_id]).length - 3; i++) {
                        socket.to(class_id + "x" + i).emit('get-settings-response', response);
                    }
                }).fail(function(error) {
                    server_error(error);
                });
            }
        });

        socket.on('disconnect', function() {
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
                            other_members : other_members
                        }

                        date = new Date().toJSON();
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
                        class_id : socket.class_id
                    }

                    date = new Date().toJSON();
                    logger.info(date + "~" + socket.username + "~logout~" +
                                socket.class_id + "~~~1~");
                    socket.emit('logout_response', {});
                }).fail(function(error) {
                    server_error(error, error);
                });
            }
        });
    });
}

