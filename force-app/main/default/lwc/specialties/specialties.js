import { LightningElement, track, api, wire } from "lwc";
import insertSpecialtyRecords from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getProvidersRelatedSpecialty from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import BoardCertificationNames from "@salesforce/resourceUrl/BoardCertificationNames";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

//Board Certification Object fields
const RELATED_RECORDS_FIELDS = [
  "Id",
  "Certification_Number__c",
  "Name",
  "IsPrimary__c"
];

export default class Specialties extends LightningElement {
  @api recordId; // contact recordId
  @track loaded = true; // spinner visibility dependency
  recordsToDelete = []; // array of records to delete
  subscription = null; // subscribe variable
  @track BoardCertificationNamesList = [];
  @track specialityArray = [
    { Id: "", Certification_Number__c: "", Name: "", IsPrimary__c: false }
  ]; //save the response

  @wire(MessageContext)
  messageContext;

  connectedCallback() {
    /*Static Resource call for Board Certification combobox field */
    let request = new XMLHttpRequest();
    request.open("GET", BoardCertificationNames, false);
    request.send(null);
    this.BoardCertificationNamesList = JSON.parse(request.responseText);

    this.subscribeToMessageChannel();
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  /*Handles the onchange of every input fields */
  handleInputBoxChange(event) {
    if (event.target.label == "Board Certification Number") {
      let value = event.detail.value;
      if (
        this.specialityArray[event.currentTarget.dataset.index].IsPrimary__c &&
        (value.trim() != "" || value != undefined)
      ) {
        event.currentTarget.setCustomValidity("");
        event.currentTarget.reportValidity();
      }
      this.specialityArray[
        event.currentTarget.dataset.index
      ].Certification_Number__c = event.detail.value;
    } else if (event.target.label == "Board Certification Name") {
      let value = event.detail.value;
      if (
        this.specialityArray[event.currentTarget.dataset.index].IsPrimary__c &&
        (value.trim() != "" || value != undefined)
      ) {
        event.currentTarget.setCustomValidity("");
        event.currentTarget.reportValidity();
      }
      this.specialityArray[event.currentTarget.dataset.index].Name =
        event.detail.value;
    } else if (event.target.label == "Primary specialty") {
      // this.specialityArray[event.currentTarget.dataset.index].IsPrimary__c = event.target.checked;

      this.specialityArray.forEach((e, index) => {
        e.IsPrimary__c =
          index == parseInt(event.currentTarget.dataset.index)
            ? event.target.checked
            : !event.target.checked;
      });
    }
  }

  /*Invokes on click of Add Specialty Button */
  addSpeciality() {
    this.specialityArray.push({
      Id: "",
      Certification_Number__c: "",
      Name: "",
      IsPrimary__c: false
    });
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeSpeciality(event) {
    console.log(event.currentTarget.dataset.index);
    let index = event.currentTarget.dataset.index;
    if (this.specialityArray[index].Id != "") {
      this.recordsToDelete.push(this.specialityArray[index].Id);
    }
    this.specialityArray.splice(index, 1);
  }

  /*Retrieves the object records */
  async retrieveRecord() {
    try {
      this.loaded = false;
      const relatedrecordsresponse = await getProvidersRelatedSpecialty({
        recId: this.recordId,
        fields: RELATED_RECORDS_FIELDS.toString(),
        sObjectName: "Board_Certification__c",
        relationshipField: "Provider__c"
      });
      console.log("121", relatedrecordsresponse);
      if (relatedrecordsresponse.length > 0) {
        let parseRecords = [];
        relatedrecordsresponse.forEach((e, index) => {
          let parseObject = {};
          parseObject.Id = e.Id;
          parseObject.Certification_Number__c = e.Certification_Number__c;
          parseObject.Name = e.Name;
          parseObject.IsPrimary__c = e.IsPrimary__c;
          parseRecords.push(parseObject);
        });
        console.log("132", parseRecords);
        this.specialityArray = [...parseRecords];
        console.log("134", this.specialityArray);
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: {
            retreived: true,
            data: this.recordId,
            stepname: "specialties"
          }
        })
      );
      this.loaded = true;
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "specialties" }
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
      // let count = 0;
      let flag = true;
      this.specialityArray.forEach((e, index) => {
        if (e.IsPrimary__c) {
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
              // count++;
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
                Certification_Number__c: e.Certification_Number__c,
                Name: e.Name,
                IsPrimary__c: e.IsPrimary__c
              };
        if (
          !(
            e.Id == "" &&
            e.Certification_Number__c == "" &&
            e.Name == "" &&
            e.IsPrimary__c == false
          )
        ) {
          dataProcessObject.Provider__c = this.recordId;
          recordArray.push(dataProcessObject);
        }
      });
      console.log("158", recordArray);
      if (flag) {
        if (!(recordArray.length == 0 && this.recordsToDelete.length == 0)) {
          await insertSpecialtyRecords({
            sObjectData: JSON.stringify(recordArray).toString(),
            recordsToDelete: JSON.stringify(this.recordsToDelete).toString(),
            sObjectName: "Board_Certification__c"
          });
        }
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "specialties"
            }
          })
        );
      }
      // else{
      //     const event = new ShowToastEvent({
      //         title: 'Error',
      //         variant: 'error',
      //         message: 'Please Complete all the fields',
      //     });
      //     this.dispatchEvent(event);
      // }
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { retreived: false, data: undefined, stepname: "specialties" }
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
          if (message.stepName == "specialties") {
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