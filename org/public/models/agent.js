class Agent {
    constructor(username, email, accessLevel, workingHours, hashedPassword) {
        this.username = username;
        this.email = email;
        this.accessLevel = accessLevel;
        this.workingHours = workingHours;
        this.hashedPassword = hashedPassword;
        this.specialties = [];
        this.agentID = null;
        this.verified = false;
        this.availability = 'Offline';
        this.workload = 0;
        this.tasks = [];
        this.ticket = null;
    }

    setAgentID(agentID) {
        this.agentID = agentID;
    }

    setAccessLevel(accessLevel) {
        this.accessLevel = accessLevel;
    }

    setWorkingHours(workingHours) {
        this.workingHours = workingHours;
    }

    setPassword(hashedPassword) {
        this.hashedPassword = hashedPassword;
    }

    setSpecialties(specialties) {
        this.specialties = specialties;
    }

    setVerified() {
        this.verified = true;
    }

    setUnverified() {
        this.verified = false;
    }

    setAvailability(status) {
        this.availability = status;
    }

    setWorkload(type) {
        if (type === 'add') { // Increment workload
            this.workload++;
        } else if (type === 'sub') { // Decrement workload
            if (this.workload > 0) { // Prevent negative workload
                this.workload--;
            }
        }
    }

    addTask(task) {
        this.tasks.push(task);
    }

    removeTask(task) {
        const index = this.tasks.indexOf(task);
        if (index > -1) {
            this.tasks.splice(index, 1);
        }
    }

    assignTicket(ticket) {
        this.ticket = ticket;
    }

    completeTicket(ticket) {
        this.ticket = null;
    }
}

module.exports = Agent;