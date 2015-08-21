function login_response(username, class_id) {
    localStorage.setItem('class_id', class_id);
    localStorage.setItem('username', username);
    location.href = '../class';
    console.log(username, class_id);
}

function groups_get_response(username, class_id, groups) {
    var socket = Student.Socket(io(location.host));
    var $groups = $('#buttons');
    var current_user = localStorage.getItem('username');
    var current_class = localStorage.getItem('class_id');
    $groups.empty();
    for (var i in groups){
        var button = '<input type="button" value="Group ';
        button += groups[i].grp_name + ' - '+ groups[i].num;
        button += '" /><br/>';
        $groups.append(button);
    }
    $('#buttons :input').click(function() {
        socket.group_join(current_user, current_class, $(this).index('#buttons :input') + 1);
    });
}

function group_join_response(username, class_id, group_id) {
    localStorage.setItem('group_id', group_id);
    location.href = '/groups';
}

function logout_response() {
    localStorage.removeItem('class_id');
    localStorage.removeItem('username');
    location.href = '/';
}

function group_info_response(username, class_id, group_id, members) {
    var current_user = localStorage.getItem('username');
    var current_group = localStorage.getItem('group_id');
    console.log(members);
    $group_name = $('#number');
    $people = $('#people');
    $group_name.html('Group: ' + current_group);    
    $people.html('');
    for (var i in members) {
        if(members[i].member_name != current_user) {
            var member = '<li id="' + members[i].member_name + '">';
            member += members[i].member_name;
            member += ' - (<span class="x">' + members[i].member_x + '</span>, ';
            member += '<span class="y">' + members[i].member_y + '</span>)</li>';
        }
        else {
            var member = '<li id="' + members[i].member_name + '">';
            member += members[i].member_name + ' (You)';
            member += ' - (<span class="x">' + members[i].member_x + '</span>, ';
            member += '<span class="y">' + members[i].member_y + '</span>)</li>';
        }
        $people.append(member);
    }
}

function coordinate_change_response(username, class_id, group_id, x, y) {
    $messages = $('#messages');
    
    $('#' + username + ' .x').html(x);
    $('#' + username + ' .y').html(y);
    $messages.append(username + ' has moved their point to (' 
                          + x + ', ' + y +')<br/>');
}

function group_leave_response(username, class_id, group_id) {
    localStorage.removeItem('group_id');
    location.href = '/class';
}
