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

// Contact object fields
const FIELDS = [
  "Contact.CAQH_Username__c",
  "Contact.CAQH_Password__c",
  "Contact.CAQH_ID__c"
];

export default class Caqh extends LightningElement {
  @api recordId; //contact recordId
  @track loaded = true; // spinner visibility dependency
  subscription = null; //subscribe variable
  @track contact = {
    caqhusername: undefined,
    caqhpassword: undefined,
    caqhId: undefined
  }; // save the response

  @wire(MessageContext)
  messageContext;

  connectedCallback() {
    this.subscribeToMessageChannel();
    if (this.recordId !== undefined) {
      this.retreiveRecord();
    }
  }

  defaultCheckBoxValue = false;
  handleCheckBoxValue() {
    this.defaultCheckBoxValue = !this.defaultCheckBoxValue;
  }

  get acceptedFormats() {
    return [".pdf", ".png", ".docx"];
  }

  // // Get the list of uploaded files
  // handleUploadFinished(event) {
  //   const uploadedFiles = event.detail.files;
  //   alert("No. of files uploaded : " + uploadedFiles.length);
  // }

  /*Retrieves the object records */
  async retreiveRecord() {
    try {
      this.loaded = false;
      const response = await getRecord({
        recId: this.recordId,
        fields: FIELDS.toString(),
        sObjectName: "Contact"
      });
      this.contact.caqhusername =
        response.CAQH_Username__c !== undefined
          ? response.CAQH_Username__c
          : undefined;
      this.contact.caqhpassword =
        response.CAQH_Password__c !== undefined
          ? response.CAQH_Password__c
          : undefined;
      this.contact.caqhId =
        response.CAQH_ID__c !== undefined ? response.CAQH_ID__c : undefined;
      console.log("Response", response);
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: true, data: response.Id, stepname: "CAQH" }
        })
      );
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "CAQH" }
        })
      );
      this.loaded = true;
    }
  }

  /*Saves/Create the record */
  async saveRecord() {
    try {
      this.loaded = false;
      const inputsArray = this.template.querySelectorAll(".input");
      let record = {
        CAQH_Username__c: inputsArray[0].value,
        CAQH_Password__c: inputsArray[1].value,
        CAQH_ID__c: inputsArray[2].value,
        Id: this.recordId
      };
      console.log(record);
      let response = await upsertContact({ con: record });
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { isCompleted: true, data: response, stepname: "CAQH" }
        })
      );
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { isCompleted: false, data: undefined, stepname: "CAQH" }
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
          if (message.stepName === "CAQH") {
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
