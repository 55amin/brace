class Customer {
    constructor(username, email, registerDate) {
        this.username = username;
        this.email = email;
        this.ticket = {}; // Tickets stored in dictionary so new ticket can be opened whilst closed ticket is still stored
        this.customerID = null;
        this.registerDate = registerDate;
    }

    setCustomerID(customerID) {
        this.customerID = customerID;
    }

    openTicket(ticket) {
        this.ticket[ticket] = 'Open';
    }

    closeTicket(ticket) {
        this.ticket[ticket] = 'Closed';
    }

    removeTicket(ticket) {
        delete this.ticket[ticket];
    }
}

module.exports = Customer;
