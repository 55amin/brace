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
}

module.exports = Agent;