import { LightningElement, track, api } from "lwc";

export default class AddOtherNames extends LightningElement {
  @api otherNamesArray = []; // other names array input
  @track otherNamesArrayCloned = []; // more other names added array input
  recordsToDelete = []; // records to delete

  connectedCallback() {
    this.recordsToDelete = [];
    this.otherNamesArrayCloned = JSON.parse(
      JSON.stringify(this.otherNamesArray)
    );
    this.dispatchEvent(
      new CustomEvent("addothername", {
        detail: { records: this.otherNamesArrayCloned }
      })
    );
  }

  /*Handles the onchange of every input fields */
  handleOtherNameChange(event) {
    const index = event.currentTarget.dataset.index;
    if (event.target.label === "First Name") {
      this.otherNamesArrayCloned[index].verifiable__First_Name__c =
        event.target.value;
    } else if (event.target.label === "Last Name") {
      this.otherNamesArrayCloned[index].verifiable__Last_Name__c =
        event.target.value;
    }
  }

  /*Invokes on click of Add Other Name Button */
  addOtherName() {
    this.otherNamesArrayCloned.push({
      Id: "",
      verifiable__First_Name__c: "",
      verifiable__Last_Name__c: ""
    });
    this.otherNamesArray = this.otherNamesArrayCloned;
    this.dispatchEvent(
      new CustomEvent("addothername", {
        detail: { records: this.otherNamesArrayCloned }
      })
    );
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeOtherName(event) {
    let index = event.currentTarget.dataset.index;
    if (this.otherNamesArrayCloned[index].Id !== "") {
      this.recordsToDelete.push(this.otherNamesArrayCloned[index].Id);
    }
    this.otherNamesArrayCloned.splice(index, 1);
    this.otherNamesArray = this.otherNamesArrayCloned;
    this.dispatchEvent(
      new CustomEvent("removeothername", {
        detail: { records: this.otherNamesArrayCloned }
      })
    );
  }

  /*Checks validations */
  @api validate() {
    let firstName = this.template.querySelectorAll(".firstname");
    let lastName = this.template.querySelectorAll(".lastname");
    let aliasArr = [];
    for (let i = 0; i < firstName.length; i++) {
      let recId =
        this.otherNamesArrayCloned[i].Id !== ""
          ? this.otherNamesArrayCloned[i].Id
          : undefined;
      let aliasObj =
        recId !== undefined
          ? {
              Id: recId,
              verifiable__First_Name__c: firstName[i].value,
              verifiable__Last_Name__c: lastName[i].value
            }
          : {
              verifiable__First_Name__c: firstName[i].value,
              verifiable__Last_Name__c: lastName[i].value
            };
      aliasArr.push(aliasObj);
      if (
        firstName[i].value === "" ||
        firstName[i].value == null ||
        firstName[i].value === undefined
      ) {
        firstName[i].focus();
        firstName[i].reportValidity();
        return { validated: false };
      }
      if (
        lastName[i].value === "" ||
        lastName[i].value == null ||
        lastName[i].value === undefined
      ) {
        lastName[i].focus();
        lastName[i].reportValidity();
        return { validated: false };
      }
    }
    return {
      validated: true,
      response: aliasArr,
      recordsToDelete: this.recordsToDelete
    };
  }
}
