(function () {
    'use strict';
}());

//HELPER FUNCTIONS ==============================================================================================

var Helper = {
    getPosition: function (string, subString, index) {
        return string.split(subString, index).join(subString).length;
    }
};

//MESSAGES ======================================================================================================

var Messages = {
    getHelpMessage: function () {
        var helpMessage = {
            cards: [{
                header: {
                    title: "ActionBot",
                    subtitle: "Quick Google Task Bot",
                    imageUrl: "https://cdn4.iconfinder.com/data/icons/ionicons/512/icon-ios7-help-outline-128.png",
                    imageStyle: "IMAGE"
                },
                sections: [{
                    widgets: [{
                        keyValue: {
                            topLabel: "Synopsis",
                            content: "@ActionBot `command` `argument(s)` "
                        }
                    }]
                },
                        {
                    header: "Description",
                    widgets: [{
                        textParagraph: {
                            text: "\@ActionBot is a bot that interacts with Google Tasks."
                        }
                    }]
                },
                        {
                    widgets: [{
                        buttons: [{
                            textButton: {
                                text: "REPORT AN ISSUE (TBD)",
                                onClick: {
                                    openLink: {
                                        url: "http://www.google.com"
                                    }
                                }
                            }
                        }]
                    }]
                }]
            }]
        };
        return helpMessage;
    },
    getListMessage: function (tasks) {
        if (tasks === 'No tasks found.') {
            return {text: 'No tasks found.'};
        }
        var formattedTasks = [];
        tasks.forEach(function (task) {
            if (task.status === "needsAction") {
                var date = String(task.due).substr(0, 10);
                if (date === 'undefined') {
                    date = '';
                }
                formattedTasks.push({
                    widgets: [{
                        keyValue: {
                            content: task.title,
                            contentMultiline: true,
                            bottomLabel: date,
                            onClick: {
                                action: {
                                    actionMethodName: "viewTask",
                                    parameters: [{
                                        key: 'id',
                                        value: task.id
                                    }]
                                }
                            },
                            button: {
                                imageButton: {
                                    iconUrl: "https://storage.googleapis.com/daube-design-assets.appspot.com/baseline_radio_button_unchecked_black_18dp.png",
                                    onClick: {
                                        action: {
                                            actionMethodName: "completeTask",
                                            parameters: [{
                                                key: 'id',
                                                value: task.id
                                            }]
                                        }
                                    }
                                }
                            }
                        }
                    }]
                });
            }
        });
        return formattedTasks;
    },
    getTaskDetailMessage: function (task) {
        var date = String(task.due).substr(0, 10);
        if (date === 'undefined') {
            date = '';
        }
        var taskDetailMessage = {
            cards: [{
                sections: [{
                    widgets: [{
                        textParagraph: {
                            text: "<b>Title:</b>\n" + task.title
                        }
                    }]
                },
                        {
                    widgets: [{
                        textParagraph: {
                            text: "<b>Notes:</b>\n" + task.notes || 'no notes'
                        }
                    }]
                },
                        {
                    widgets: [{
                        buttons: [{
                            textButton: {
                                text: "BACK",
                                onClick: {
                                    action: {
                                        actionMethodName: "back",
                                        parameters: [{
                                            key: 'id',
                                            value: task.id
                                        }]
                                    }
                                }
                            }
                        }]
                    }]
                }]
            }]
        };
        return taskDetailMessage;
    }
};

//TASK API TASK SERVICE =========================================================================================

var TaskService = {
    addTask: function (taskListId, task) {
        var fTask = {
            title: task
        };
        // @ts-ignore
        fTask = Tasks.Tasks.insert(fTask, taskListId);
    },
    getTasks: function (taskListId) {
        // @ts-ignore
        var tasks = Tasks.Tasks.list(taskListId);
        if (tasks.items) {
            return tasks.items;
        }
        return 'No tasks found.';
    },
    completeTask: function (taskListId, taskId) {
        // @ts-ignore
        var completedTask = Tasks.Tasks.get(taskListId, taskId);
        completedTask.status = "completed";
        // @ts-ignore
        Tasks.Tasks.update(completedTask, taskListId, taskId);
    },
    getTask: function (taskListId, taskId) {
        // @ts-ignore
        return Tasks.Tasks.get(taskListId, taskId);
    }
};

//CONTROLLER ====================================================================================================

var Controller = {
    addTask: function (task) {
        TaskService.addTask("@default", task);
        var addMessage = "`" + task + "` added to Tasks";
        return {text: addMessage};
    },
    getTasks: function () {
        var tasks = TaskService.getTasks("@default");
        var listMessage = Messages.getListMessage(tasks);
        return {cards: [{sections: listMessage}]};
    },
    completeTask: function (id) {
        TaskService.completeTask('@default', id);
        var updatedCard = Controller.getTasks();
        updatedCard.actionResponse = {type: "UPDATE_MESSAGE"};
        return updatedCard;
    },
    viewTask: function (id) {
        var task = TaskService.getTask('@default', id);
        Logger.log(task);
        var taskDetailMessage = Messages.getTaskDetailMessage(task);
        taskDetailMessage.actionResponse = {type: "UPDATE_MESSAGE"};
        return taskDetailMessage;
    }
};

function onMessage(event) {
    if (event.message.argumentText) {
        var entireArgument = event.message.argumentText.trim();
        var firstSpacePosition = entireArgument.length;
        if (entireArgument.indexOf(" ") !== -1) {
            firstSpacePosition = entireArgument.indexOf(" ");
        }
        var command = entireArgument.substr(0, firstSpacePosition);
        var task = entireArgument.substr(Helper.getPosition(entireArgument, " ", 1));
        switch (command) {
        case "help" || "Help":
            return Messages.getHelpMessage();
        case "add" || "Add" || "a" || "A":
            return Controller.addTask(task);
        case "list" || "List" || "l" || "L":
            return Controller.getTasks();
        }
    } else {
        return {"text": "type `@ActionBot help` for assistance."};
    }
}

function onAddToSpace(event) {
    var message = "Thank you for adding me, " + event.user.displayName + "!";
    return {"text": message};
}

function onRemoveFromSpace(event) {
    console.info("Bot removed from ", event.space.name);
}

function onCardClick(event) {
    var id = event.action.parameters[0].value;
    var method = event.action.actionMethodName;
    switch (method) {
    case "completeTask":
        return Controller.completeTask(id);
    case "viewTask":
        return Controller.viewTask(id);
    case "back":
        var list = Controller.getTasks();
        list.actionResponse = {type: "UPDATE_MESSAGE"};
        return list;
    }
}