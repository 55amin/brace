class Task {
    constructor(title, desc, creator, deadline, assignedTo, creationDate) {
      this.title = title;
      this.desc = desc;
      this.creator = creator;
      this.deadline = deadline;
      this.assignedTo = assignedTo;
      this.status = 'Assigned';
      this.creationDate = creationDate;
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
