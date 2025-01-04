class Administrator {
    constructor(forename, surname, email, phone, hashedPassword) {
      this.forename = forename;
      this.surname = surname;
      this.email = email;
      this.phone = phone;
      this.hashedPassword = hashedPassword;
      this.adminID = null;
    }

    setAdminID(adminID) {
      this.adminID = adminID;
    }
}

module.exports = Administrator;

