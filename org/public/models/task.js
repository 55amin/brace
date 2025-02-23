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
      this.completionStatus = {};
      assignedTo.forEach(agentID => {
        this.completionStatus[agentID] = false; 
      });
    }

    setTaskID(taskID) {
      this.taskID = taskID;
    }

    setStatus(status) {
      this.status = status;
    }

    setComplete(agentID, status) {
      this.completionStatus[agentID] = status;
      if (Object.values(this.completionStatus).every(status => status === true)) {
        this.status = 'Completed';
      }
  }
}

module.exports = Task;
