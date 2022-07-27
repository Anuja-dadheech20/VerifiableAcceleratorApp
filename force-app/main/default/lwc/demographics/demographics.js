import { api, LightningElement, wire, track } from "lwc";
import upsertContact from "@salesforce/apex/ProviderApplicationFormController.saveContact";
import getRecord from "@salesforce/apex/ProviderApplicationFormController.getRecord";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import StateListJson from "@salesforce/resourceUrl/StateListJson";

// contact object fields
const FIELDS = [
  "Contact.Social_Security_Number__c",
  "Languages__c",
  "Contact.MailingStreet",
  "Contact.MailingPostalCode",
  "Contact.MailingState",
  "Contact.MailingCity"
];

export default class Demographics extends LightningElement {
  @api recordId; // contact recordId
  @track loaded = true; // spinner visibility dependency
  @track otherLanguage = false; // stores Other Language checkbox values
  recordsToDelete = [];
  subscription = null; // subscribe variable
  @track StateList = []; // variable to store the picklist values
  @track contact = {
    ssn: undefined,
    address: undefined,
    city: undefined,
    state: undefined,
    zipcode: undefined
  }; // save response
  @track languageArray = [{ Languages__c: "" }];

  @wire(MessageContext)
  messageContext;

  connectedCallback() {
    /*Static Resource call for State combobox field */
    let request = new XMLHttpRequest();
    request.open("GET", StateListJson, false);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Access-Control-Allow-Origin", "*");
    request.send(null);
    this.StateList = JSON.parse(request.responseText);

    this.subscribeToMessageChannel();
    console.log("RecordId" + this.recordId);
    if (this.recordId != undefined) {
      this.retreiveRecord();
    }
  }

  // State field Handler
  //selectedState;
  handleStateChange(event) {
    this.contact.state = event.detail.value;
    console.log("Selected", this.contact.state);
  }

  handleLanguageCheckbox() {
    this.otherLanguage = !this.otherLanguage;
    console.log("30", this.otherLanguage);
  }

  handleLanguageChange(event) {
    //this.languageArray = [...event.detail.records];
    this.languageArray[event.currentTarget.dataset.index].Languages__c =
      event.detail.value;
  }

  addLanguages() {
    this.languageArray.push({ Languages__c: "" });
  }

  removeLanguage(event) {
    console.log(event.currentTarget.dataset.index);
    let index = event.currentTarget.dataset.index;
    if (this.languageArray[index].Id != "") {
      this.recordsToDelete.push(this.languageArray[index].Id);
    }
    this.languageArray.splice(index, 1);
  }

  /* Retreives the record */
  async retreiveRecord() {
    try {
      this.loaded = false;
      const response = await getRecord({
        recId: this.recordId,
        fields: FIELDS.toString(),
        sObjectName: "Contact"
      });
      this.contact.ssn =
        response.Social_Security_Number__c != undefined
          ? response.Social_Security_Number__c
          : undefined;
      this.contact.address =
        response.MailingStreet != undefined
          ? response.MailingStreet
          : undefined;
      this.contact.city =
        response.MailingCity != undefined ? response.MailingCity : undefined;
      this.contact.state =
        response.MailingState != undefined ? response.MailingState : undefined;
      this.contact.zipcode =
        response.MailingPostalCode != undefined
          ? response.MailingPostalCode
          : undefined;
      console.log(response.MailingState);
      console.log(this.contact.state);
      const lang =
        response.Languages__c !== undefined
          ? response.Languages__c.split(",")
          : undefined;
      console.log("lang", JSON.stringify(lang));
      this.languageArray = [];
      lang.forEach((e) => {
        this.languageArray.push({ Languages__c: "" + e });
      });
      console.log("langArray", JSON.stringify(this.languageArray));
      if (this.languageArray.length > 0) {
        this.otherLanguage = true;
      }
      console.log("ResponseR", JSON.stringify(response));
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: true, data: response.Id, stepname: "basic" }
        })
      );
    } catch (error) {
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "basic" }
        })
      );
      console.log(error);
    }
  }

  /* Saves the record */
  async saveRecord() {
    try {
      this.loaded = false;
      const ssn = this.template.querySelector(".ssn");
      const address = this.template.querySelector(".add1");
      const city = this.template.querySelector(".city");
      const state = this.template.querySelector(".state");
      const zipcode = this.template.querySelector(".zipcode");
      console.log("ssn", ssn);
      let languagess = "";
      console.log("languageArray", JSON.stringify(this.languageArray));
      this.languageArray.forEach((e) => {
        languagess += e.Languages__c + ",";
      });
      languagess = languagess.slice(0, languagess.length - 1);
      console.log("languagess", JSON.stringify(languagess));

      let ssnValue = ssn.value;
      const regex = /[0-9]{3}-[0-9]{2}-[0-9]{4}$/;
      console.log("hi", regex.test(ssnValue));
      console.log(ssnValue.length);
      console.log(ssnValue);
      if (ssnValue != undefined && ssnValue != "" && !regex.test(ssnValue)) {
        console.log("IN");
        ssn.setCustomValidity("Please enter a valid SSN in NNN-NN-NNNN format");
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: false,
              data: this.recordId,
              stepname: "basic"
            }
          })
        );
        ssn.reportValidity();
        return;
      }

      let record = {
        Id: this.recordId,
        Social_Security_Number__c: ssn.value,
        Languages__c: languagess,
        MailingStreet: address.value,
        MailingCity: city.value,
        MailingState: state.value,
        MailingPostalCode: zipcode.value
      };
      console.log("Record: ", record);
      let response = await upsertContact({ con: record });
      console.log("Response", JSON.stringify(response));
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { isCompleted: true, data: response, stepName: "basic" }
        })
      );
    } catch (ex) {
      console.log(ex);
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { isCompleted: false, data: undefined, stepname: "basic" }
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
          if (message.stepName == "basic") {
            this.saveRecord();
          }
        },
        { scope: APPLICATION_SCOPE }
      );
    }
  }

  /*LMS unsubscribe method */
  unsubscribeToMessageChannel() {
    unsubscribe(this.subscription);
    this.subscription = null;
  }

  disconnectedCallback() {
    this.unsubscribeToMessageChannel();
  }
}