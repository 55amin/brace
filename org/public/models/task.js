class Task {
    constructor(title, desc, creator, deadline, assignedTo) {
      this.title = title;
      this.desc = desc;
      this.creator = creator;
      this.deadline = deadline;
      this.assignedTo = assignedTo;
      this.status = 'Assigned';
      this.creationDate = new Date();
      this.taskID = null;
    }

    setTaskID(taskID) {
      this.taskID = taskID;
    }

    setStatus(status) {
      this.status = status;
    }

}

module.exports = Task;
