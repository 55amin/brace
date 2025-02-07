class Agent {
    constructor(username, email, hashedPassword) {
        this.username = username;
        this.email = email;
        this.hashedPassword = hashedPassword;
        this.agentID = null;
        this.verified = false;
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
}

module.exports = Agent;