class Agent {
    constructor(username, email, hashedPassword) {
        this.username = username;
        this.email = email;
        this.hashedPassword = hashedPassword;
        this.agentID = null;
        this.verified = false;
        this.availability = 'Offline';
        this.workload = 0;
    }

    setAgentID(agentID) {
        this.agentID = agentID;
    }

    setPassword(hashedPassword) {
        this.hashedPassword = hashedPassword;
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