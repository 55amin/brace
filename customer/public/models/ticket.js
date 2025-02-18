class Ticket {
    constructor(title, desc, creator, type, creationDate) {
        this.title = title;
        this.desc = desc;
        this.creator = creator;
        this.type = type;
        this.deadline = new Date(creationDate);
        this.deadline.setDate(this.deadline.getDate() + 1);
        this.assignedTo = null;
        this.status = 'Unassigned';
        this.priority = 0;
        this.triage = false;
        this.creationDate = creationDate;
        this.ticketID = null;
    }

    setTicketID(ticketID) {
        this.ticketID = ticketID;
    }

    setStatus(status) {
        this.status = status;
    }

    assignTo(agent) {
        this.assignedTo = agent;
    }

    raisePriority() {
        if (this.priority < 3) {
            this.priority++;
        }
    }

    setPriority(priority) {
        if (priority > 3 || priority < 0) {
            return;
        } else {
            this.priority = priority;
        }
    }

    triage() {
        this.triage = true;
        this.raisePriority();
    }
}

module.exports = Ticket;
