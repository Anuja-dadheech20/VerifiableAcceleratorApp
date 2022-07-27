import { LightningElement, api, wire, track } from "lwc";
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
  "Contact.MailingStreet",
  "Contact.MailingPostalCode",
  "Contact.MailingState",
  "Contact.MailingCity"
];

export default class Address extends LightningElement {
  @api recordId; // contact recordId
  @track loaded = true; // spinner visibility dependency
  subscription = null; // subscribe variable
  @track StateList = []; // variable to store the picklist values
  @track contact = {
    address1: undefined,
    city: undefined,
    state: undefined,
    zipcode: undefined
  }; // save response

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
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  // State field Handler
  selectedState;
  handleStateChange(event) {
    this.selectedState = event.detail.value;
  }

  /*Retreives the record*/
  async retrieveRecord() {
    try {
      this.loaded = false;
      const response = await getRecord({
        recId: this.recordId,
        fields: FIELDS.toString(),
        sObjectName: "Contact"
      });
      this.contact.address1 =
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
      console.log("Response", response);
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: true, data: response.Id, stepname: "address" }
        })
      );
    } catch (error) {
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "address" }
        })
      );
      console.log(error);
    }
  }

  /*Saves the record*/
  async saveRecord() {
    try {
      this.loaded = false;
      const address1 = this.template.querySelector(".add1");
      const city = this.template.querySelector(".city");
      const state = this.template.querySelector(".state");
      const zipcode = this.template.querySelector(".zipcode");

      let record = {
        Id: this.recordId,
        MailingStreet: address1.value,
        MailingCity: city.value,
        MailingState: state.value,
        MailingPostalCode: zipcode.value
      };
      console.log("Record", record);
      let response = await upsertContact({ con: record });
      console.log("Respone", response);
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { isCompleted: true, data: response, stepname: "address" }
        })
      );
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { isCompleted: false, data: undefined, stepname: "address" }
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
          if (message.stepName == "address") {
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