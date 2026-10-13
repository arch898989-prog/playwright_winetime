const contacts = require("../test-data/contacts-page.json");

class ContactsPage {
  constructor(page) {
    this.page = page;
  }

  get root() {
    return this.page.locator("#content-wrapper");
  }

  get heading() {
    return this.root.getByRole("heading", {
      level: 1,
      name: contacts.heading,
      exact: true,
    });
  }

  get consultationPhones() {
    return this.root.locator(".j-fx-row-xs.j-wrap-xs.j-gap-20-xs");
  }

  consultationPhone(number) {
    return this.consultationPhones.getByRole("link", {
      name: number,
      exact: true,
    });
  }

  get businessContacts() {
    return this.root.locator(".additional-info");
  }

  businessEmail(address) {
    return this.businessContacts.getByRole("link", {
      name: address,
      exact: true,
    });
  }

  get workingHours() {
    return this.root.locator(".j-mw-400-xs").filter({
      hasText: contacts.workingHoursLabel,
    });
  }

  get stores() {
    return this.root.locator(".address");
  }
}

module.exports = { ContactsPage };
