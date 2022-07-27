import { LightningElement, api, wire, track } from "lwc";
import createContact from "@salesforce/apex/ProviderApplicationFormController.saveContact";
import insertOtherNamesAlias from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getRecord from "@salesforce/apex/ProviderApplicationFormController.getRecord";
import getProvidersRelatedAlias from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";

//Contact object Fields
const FIELDS = [
  "Contact.FirstName",
  "Contact.LastName",
  "Contact.Phone",
  "Contact.Email",
  "Contact.NPI_Number__c",
  "Contact.Birthdate"
];

//Alias (Related object) fields
const RELATED_RECORDS_FIELDS = [
  "Id",
  "verifiable__First_Name__c",
  "verifiable__Last_Name__c"
];

export default class GetStarted extends LightningElement {
  @api recordId; // contact recordId
  @track loaded = true; // spinner visibility dependency
  @track otherNameCheckbox = false; // otherName checkbox dependency
  subscription = null; // subscribe variable
  @track contact = {
    firstname: undefined,
    lastname: undefined,
    email: undefined,
    phone: undefined,
    npi: undefined,
    dob: undefined
  }; // contact object array to save the response
  @track otherNamesArray = [
    { verifiable__First_Name__c: "", verifiable__Last_Name__c: "", Id: "" }
  ]; //other names(alias) object array to save the response

  @wire(MessageContext)
  messageContext;

  connectedCallback() {
    let contactId = new URL(window.location.href).searchParams.get("id");
    this.subscribeToMessageChannel();
    if (this.recordId != undefined || contactId) {
      if (contactId) {
        this.recordId = contactId;
      }
      console.log("encrypted record id", this.recordId);
      this.retreiveRecord();
    }
  }

  handleOtherNameCheckbox() {
    this.otherNameCheckbox = !this.otherNameCheckbox;
  }

  handleAddOtherName(event) {
    this.otherNamesArray = [...event.detail.records];
  }

  handleRemoveOtherName(event) {
    this.otherNamesArray = [...event.detail.records];
  }

  /*Retrieves the records along with their related ones*/
  async retreiveRecord() {
    try {
      this.loaded = false;
      const response = await getRecord({
        recId: this.recordId,
        fields: FIELDS.toString(),
        sObjectName: "Contact"
      });
      const relatedrecordsresponse = await getProvidersRelatedAlias({
        recId: this.recordId,
        fields: RELATED_RECORDS_FIELDS.toString(),
        sObjectName: "verifiable__Alias__c",
        relationshipField: "Provider__c"
      });
      this.contact.firstname =
        response.FirstName !== undefined ? response.FirstName : undefined;
      this.contact.lastname =
        response.LastName !== undefined ? response.LastName : undefined;
      this.contact.email =
        response.Email !== undefined ? response.Email : undefined;
      this.contact.phone =
        response.Phone !== undefined ? response.Phone : undefined;
      this.contact.npi =
        response.NPI_Number__c !== undefined
          ? response.NPI_Number__c
          : undefined;
      this.contact.dob =
        response.Birthdate !== undefined ? response.Birthdate : undefined;
      console.log("Response", response);
      console.log("related records response", relatedrecordsresponse);
      this.loaded = true;
      if (relatedrecordsresponse.length > 0) {
        this.otherNameCheckbox = true;
        this.otherNamesArray = [...relatedrecordsresponse];
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: {
            retreived: true,
            data: response.Id,
            stepname: "getStarted",
            relatedrecords: relatedrecordsresponse
          }
        })
      );
    } catch (error) {
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: {
            retreived: false,
            data: undefined,
            stepname: "getStarted",
            relatedrecords: undefined
          }
        })
      );
      console.log(error);
    }
  }

  /*Checks the validations of OtherNames and Get started component*/
  validateAndSaveData() {
    this.loaded = false;
    if (this.otherNameCheckbox) {
      let responseFromOtherNames = this.template
        .querySelector("c-add-other-names")
        .validate();
      console.log(
        "Response of Other names",
        JSON.parse(JSON.stringify(responseFromOtherNames))
      );
      if (responseFromOtherNames.validated == true) {
        this.getStartedNameValidations(
          responseFromOtherNames.response,
          responseFromOtherNames.recordsToDelete
        );
      } else if (responseFromOtherNames.validated == false) {
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: { isCompleted: false, stepname: "getStarted" }
          })
        );
      }
    } else {
      this.getStartedNameValidations([], []);
    }
  }

  isValidDate(dateString) {
    // First check for the pattern
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) return false;

    // Parse the date parts to integers
    var parts = dateString.split("/");
    var day = parseInt(parts[1], 10);
    var month = parseInt(parts[0], 10);
    var year = parseInt(parts[2], 10);

    // Check the ranges of month and year
    if (year < 1000 || year > 3000 || month == 0 || month > 12) return false;

    var monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Adjust for leap years
    if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
      monthLength[1] = 29;

    // Check the range of the day
    return day > 0 && day <= monthLength[month - 1];
  }

  /*Saves the records */
  async getStartedNameValidations(
    responseFromOtherNamesAlias,
    aliasRecordsToDelete
  ) {
    try {
      const inputsArray = this.template.querySelectorAll(".input");

      if (
        inputsArray[2].value == "" ||
        inputsArray[2].value == undefined ||
        inputsArray[2].value.trim().length == 0
      ) {
        inputsArray[2].focus();
        inputsArray[2].setCustomValidity("Complete this field");
        this.loaded = true;
        inputsArray[2].reportValidity();
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: { isCompleted: false, stepname: "getStarted" }
          })
        );
        return;
      }

      if (
        inputsArray[3].value == "" ||
        inputsArray[3].value == undefined ||
        inputsArray[3].value.trim().length == 0
      ) {
        inputsArray[3].focus();
        inputsArray[3].setCustomValidity("Complete this field");
        this.loaded = true;
        inputsArray[3].reportValidity();
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: { isCompleted: false, stepname: "GetStarted" }
          })
        );
        return;
      }

      let todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      let dobDate = new Date(inputsArray[5].value);
      dobDate.setHours(0, 0, 0, 0);
      console.log("todayDate := " + todayDate);
      console.log("dobDate := " + dobDate);

      if (dobDate >= todayDate) {
        console.log("If");
        inputsArray[5].setCustomValidity("Invalid Date");
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: { isCompleted: false, stepname: "getStarted" }
          })
        );
        inputsArray[5].reportValidity();
        return;
      }

      let record =
        this.recordId !== undefined
          ? {
              Id: this.recordId,
              FirstName: inputsArray[2].value,
              LastName: inputsArray[3].value,
              Email: inputsArray[0].value,
              Phone: inputsArray[1].value,
              NPI_Number__c: inputsArray[4].value,
              Birthdate: inputsArray[5].value
            }
          : {
              FirstName: inputsArray[2].value,
              LastName: inputsArray[3].value,
              Email: inputsArray[0].value,
              Phone: inputsArray[1].value,
              NPI_Number__c: inputsArray[4].value,
              Birthdate: inputsArray[5].value
            };
      console.log("Record" + record);
      let response = await createContact({ con: record });

      if (this.otherNameCheckbox) {
        console.log("152", responseFromOtherNamesAlias);
        let responseArray = [];
        responseFromOtherNamesAlias.forEach((e) => {
          let responseObject = { ...e };
          responseObject.Provider__c = response;
          responseArray.push(responseObject);
        });
        await insertOtherNamesAlias({
          sObjectData: JSON.stringify(responseArray).toString(),
          recordsToDelete: JSON.stringify(aliasRecordsToDelete).toString(),
          sObjectName: "verifiable__Alias__c"
        });
      }
      console.log("Response contact", response);
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { isCompleted: true, data: response, stepname: "getStarted" }
        })
      );
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "getStarted" }
        })
      );
      this.loaded = true;
    }
  }

  /*LMS subscribe method : called when payload is dispatched */
  subscribeToMessageChannel() {
    if (!this.subscription) {
      this.subscription = subscribe(
        this.messageContext,
        StepCompletionEvent,
        (message) => {
          console.log(message);
          if (message.stepName == "getStarted") {
            this.validateAndSaveData();
          }
        },
        { scope: APPLICATION_SCOPE }
      );
    }
  }

  /*LMS unsubscribe method*/
  unsubscribeToMessageChannel() {
    unsubscribe(this.subscription);
    this.subscription = null;
  }

  disconnectedCallback() {
    this.unsubscribeToMessageChannel();
  }
}
