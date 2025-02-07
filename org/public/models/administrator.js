class Administrator {
    constructor(forename, surname, email, phone, hashedPassword) {
      this.forename = forename;
      this.surname = surname;
      this.email = email;
      this.phone = phone;
      this.hashedPassword = hashedPassword;
      this.adminID = null;
      this.verified = false;
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
}

module.exports = Administrator;
