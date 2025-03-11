class Administrator {
    constructor(forename, surname, email, phone, hashedPassword) {
      this.forename = forename;
      this.surname = surname;
      this.email = email;
      this.phone = phone;
      this.hashedPassword = hashedPassword;
      this.adminID = null;
      this.verified = false;
      this.ticket = null;
    }

    setAdminID(adminID) {
      this.adminID = adminID;
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

    assignTicket(ticket) {
      this.ticket = ticket;
    }

    completeTicket() {
      this.ticket = null;
    }
}

module.exports = Administrator;
