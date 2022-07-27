import { LightningElement, track, api, wire } from "lwc";
import insertLicenseRecords from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getProvidersRelatedLicense from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import StateListJson from "@salesforce/resourceUrl/StateListJson";
import LicenseTypeJson from "@salesforce/resourceUrl/LicenseTypeJson";

// License object fields
const RELATED_RECORDS_FIELDS = [
  "Id",
  "Jurisdiction_State__c",
  "License_Number__c",
  "License_Type_ID__c",
  "Primary_License__c"
];

export default class License extends LightningElement {
  @api recordId; //contact recordId
  @track loaded = true; //spinner visibility dependency
  recordsToDelete = []; // array of records to delete
  subscription = null; // subscribe variable
  check;
  @track StateList = []; // variable to store the picklist values
  @track LicenseType = []; // variable to store the picklist values
  @track licenseArray = [
    {
      Id: "",
      Jurisdiction_State__c: "",
      License_Number__c: "",
      License_Type_ID__c: "",
      Primary_License__c: false
    }
  ]; // save the response

  @wire(MessageContext)
  messageContext;
 
  connectedCallback() {
    /*Static Resource call for State combobox field */
    let request = new XMLHttpRequest();
    request.open("GET", StateListJson, false);
    request.send(null);
    this.StateList = JSON.parse(request.responseText);

    /*Static Resource call for License Type combobox field */
    let requestforLicenseType = new XMLHttpRequest();
    requestforLicenseType.open("GET", LicenseTypeJson, false);
    requestforLicenseType.send(null);
    this.LicenseType = JSON.parse(requestforLicenseType.responseText);

    this.subscribeToMessageChannel();
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  /*Handles the onchange of every input fields */
  handleInputBoxChange(event) {
    if (event.target.label == "License State") {
      let value = event.detail.value;
      if (
        this.licenseArray[event.currentTarget.dataset.index]
          .Primary_License__c &&
        (value.trim() != "" || value != undefined)
      ) {
        event.currentTarget.setCustomValidity("");
        event.currentTarget.reportValidity();
      }
      this.licenseArray[
        event.currentTarget.dataset.index
      ].Jurisdiction_State__c = event.detail.value;
    } else if (event.target.label == "License Number") {
      let value = event.detail.value;
      if (
        this.licenseArray[event.currentTarget.dataset.index]
          .Primary_License__c &&
        (value.trim() != "" || value != undefined)
      ) {
        event.currentTarget.setCustomValidity("");
        event.currentTarget.reportValidity();
      }
      this.licenseArray[event.currentTarget.dataset.index].License_Number__c =
        event.detail.value;
    } else if (event.target.label == "License Type") {
      let value = event.detail.value;
      if (
        this.licenseArray[event.currentTarget.dataset.index]
          .Primary_License__c &&
        (value.trim() != "" || value != undefined)
      ) {
        event.currentTarget.setCustomValidity("");
        event.currentTarget.reportValidity();
      }
      this.licenseArray[event.currentTarget.dataset.index].License_Type_ID__c =
        event.detail.value;
    } else if (event.target.label == "Primary License") {
      this.licenseArray[event.currentTarget.dataset.index].Primary_License__c =
        event.target.checked;
      console.log(event.currentTarget.dataset.index);

      for (var i = 0; i < this.licenseArray.length; i++) {
        console.log("i", i);
        if (i != event.currentTarget.dataset.index && event.target.checked) {
          console.log("If");
          this.licenseArray[i].Primary_License__c = false;
        }
      }
      console.log(JSON.stringify(this.licenseArray));

      // this.licenseArray.forEach((e, index) => {
      //   e.Primary_License__c = (index == parseInt(event.currentTarget.dataset.index)) ? event.target.checked : !event.target.checked;
      // });
    }
  }

  /*Invokes on click of Add License Button */
  addLicenses() {
    this.licenseArray.push({
      Id: "",
      Jurisdiction_State__c: "",
      License_Number__c: "",
      License_Type_ID__c: "",
      Primary_License__c: false
    });
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeLicense(event) {
    console.log(event.currentTarget.dataset.index);
    let index = event.currentTarget.dataset.index;
    if (this.licenseArray[index].Id != "") {
      this.recordsToDelete.push(this.licenseArray[index].Id);
    }
    this.licenseArray.splice(index, 1);
  }

  /*Retrieves the object records */
  async retrieveRecord() {
    try {
      this.loaded = false;
      const relatedrecordsresponse = await getProvidersRelatedLicense({
        recId: this.recordId,
        fields: RELATED_RECORDS_FIELDS.toString(),
        sObjectName: "License__c",
        relationshipField: "Provider__c"
      });
      console.log("548", relatedrecordsresponse);
      if (relatedrecordsresponse.length > 0) {
        let parseRecords = [];
        relatedrecordsresponse.forEach((e, index) => {
          let parseObject = {};
          parseObject.Id = e.Id;
          parseObject.Jurisdiction_State__c = e.Jurisdiction_State__c;
          parseObject.License_Number__c = e.License_Number__c;
          parseObject.License_Type_ID__c = e.License_Type_ID__c;
          parseObject.Primary_License__c = e.Primary_License__c;
          parseRecords.push(parseObject);
        });
        console.log("557", parseRecords);
        this.licenseArray = [...parseRecords];
        console.log("558", this.licenseArray);
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: true, data: this.recordId, stepname: "license" }
        })
      );
      this.loaded = true;
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "license" }
        })
      );
      this.loaded = true;
    }
  }

  /*Saves/Create the record */
  async saveRecord() {
    try {
      this.loaded = false;
      let recordArray = [];
      let flag = true;
      this.licenseArray.forEach((e, index) => {
        if (e.Primary_License__c) {
          let target = this.template.querySelectorAll(`[data-id="${index}"]`);
          target.forEach((e1) => {
            if (
              e1.value == "" ||
              e1.value == undefined ||
              e1.value.trim().length == 0
            ) {
              e1.setCustomValidity("Complete this field");
              this.loaded = true;
              e1.reportValidity();
              flag = false;
            }
          });
          if (!flag) {
            this.dispatchEvent(
              new CustomEvent("stepcompletionevent", {
                detail: {
                  isCompleted: false,
                  data: undefined,
                  stepname: "license"
                }
              })
            );
            return;
          }
        }

        let dataProcessObject =
          e.Id != ""
            ? e
            : {
                Jurisdiction_State__c: e.Jurisdiction_State__c,
                License_Number__c: e.License_Number__c,
                License_Type_ID__c: e.License_Type_ID__c,
                Primary_License__c: e.Primary_License__c
              };
        if (
          !(
            e.Id == "" &&
            e.Jurisdiction_State__c == "" &&
            e.License_Number__c == "" &&
            e.License_Type_ID__c == "" &&
            e.Primary_License__c == false
          )
        ) {
          dataProcessObject.Provider__c = this.recordId;
          recordArray.push(dataProcessObject);
        }
      });
      console.log("581", recordArray);
      if (flag) {
        if (!(recordArray.length == 0 && this.recordsToDelete.length == 0)) {
          await insertLicenseRecords({
            sObjectData: JSON.stringify(recordArray).toString(),
            recordsToDelete: JSON.stringify(this.recordsToDelete).toString(),
            sObjectName: "License__c"
          });
        }
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "license"
            }
          })
        );
      }
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { retreived: false, data: undefined, stepname: "license" }
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
          if (message.stepName == "license") {
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