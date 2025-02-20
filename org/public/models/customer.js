class Customer {
    constructor(username, email, registerDate) {
        this.username = username;
        this.email = email;
        this.ticket = null;
        this.customerID = null;
        this.registerDate = registerDate;
    }

    setCustomerID(customerID) {
        this.customerID = customerID;
    }

    addTicket(ticket) {
        this.ticket = ticket;
    }

    removeTicket(ticket) {
        this.ticket = null;
    }
}

module.exports = Customer;
