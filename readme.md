# Gharwale (Progressive Web Application - Server)

A simple not so formal JIRA - A task assigner for the members of the family.

## Features

* A user can edit/delete/assign a task to a specific person or collectively to a group of people.
* User can register themselves with a username, password and a secret (GharkaSecret) known to the admin of the household.
* Assigned task can be marked as done/not done only by the assigner or the assignees of the task.
* Assigned taks are categorised under three sections: 
    * All tasks
        * Finished
        * Unfinished
    * Assigned to me
        * Finished
        * Unfinished
    * Assigned by me
        * Finished
        * Unfinished
* Assigned task includes:
    * Required
        * Title
    * Optional
        * Description (default: blank)
        * Priority (default: 3)
        * Assinged to (defalut: none)
    * Default and ca'nt be changed
        * Author (default: assigner)
        * created at (default: create date)
        * updated at (default: last updated date)
* Notification count of the freshly assigned tasks to a specific user as well to the whole family is shown whenever the user logs in.

## How to configure

* Specify the MongoURl, Host Secret (GharkaSecret) and jwt based authentication secret key in '/config.js'.
* Update the corse white list in order to serve cross origin resourse request in 'routes/cors.js'.
* Run command `npm install` from the terminal in the root directory of the project (make sure node is already installed in the machine).
* Run `npm start`. (make sure the MongoDB server is up and running)

## Framework, plugins and techniques used
* Angular -v 5.2.0, AngularCli -v 1.6.5, flex-layout -v 2.0.0-beta.12, Angular Material Design -v 2.0.0-beta.12
* The client/server end uses JSON web token (SHA256 ecryption) based authentication scheme, sent via authentication header as bearer token.

## Reference
* Refer to 'https://github.com/Ashwanikumarkashyap/gharwale-client' for the client setup and configuration.
