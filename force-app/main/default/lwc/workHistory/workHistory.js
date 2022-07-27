import { LightningElement, track, api, wire } from "lwc";
import insertWorkHistoryRecords from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getProvidersRelatedWorkHistory from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import StateListJson from "@salesforce/resourceUrl/StateListJson";
import WorkHistoryTypeJSON from "@salesforce/resourceUrl/WorkHistoryTypeJSON";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

// Work History object fields
const RELATED_RECORDS_FIELDS = [
  "Id",
  "verifiable__Type__c",
  "Name",
  "verifiable__JobTitle__c",
  "verifiable__StartDate__c",
  "verifiable__EndDate__c",
  "verifiable__IsCurrentEmployer__c",
  "verifiable__AddressLine1__c",
  "verifiable__AddressLine2__c",
  "verifiable__AddressCity__c",
  "verifiable__AddressState__c",
  "verifiable__AddressZip__c",
  "verifiable__DepartureReason__c",
  "verifiable__GapExplanation__c"
];

export default class WorkHistory extends LightningElement {
  @api recordId; //contact recordId
  @track loaded = true; //spinner visibility dependency
  recordsToDelete = []; // array of records to delete
  subscription = null; // subscribe variable
  //gap;
  @track StateList = []; // variable to store the picklist values
  @track WorkHistoryType = []; // variable to store the picklist values
  @track workHistoryArray = [
    {
      Id: "",
      verifiable__Type__c: "",
      Name: "",
      verifiable__JobTitle__c: "",
      verifiable__StartDate__c: undefined,
      verifiable__EndDate__c: undefined,
      verifiable__IsCurrentEmployer__c: false,
      verifiable__AddressLine1__c: "",
      verifiable__AddressLine2__c: "",
      verifiable__AddressCity__c: "",
      verifiable__AddressState__c: "",
      verifiable__AddressZip__c: "",
      verifiable__DepartureReason__c: "",
      verifiable__GapExplanation__c: "",
      Gap: false
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

    /*Static Resource call for Work History Type combobox field */
    let requestforWorkHistoryType = new XMLHttpRequest();
    requestforWorkHistoryType.open("GET", WorkHistoryTypeJSON, false);
    requestforWorkHistoryType.send(null);
    this.WorkHistoryType = JSON.parse(requestforWorkHistoryType.responseText);

    this.subscribeToMessageChannel();
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  /*Handles the onchange of every input fields */
  handleInputBoxChange(event) {
    if (event.target.label == "Work History Type") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__Type__c = event.detail.value;
      if (event.detail.value == "Gap") {
        this.workHistoryArray[event.currentTarget.dataset.index].Gap = true;
        console.log(
          "gap",
          this.workHistoryArray[event.currentTarget.dataset.index].Gap
        );

        // this.gap = true;
      } else {
        this.workHistoryArray[event.currentTarget.dataset.index].Gap = false;
        console.log(
          "employment",
          this.workHistoryArray[event.currentTarget.dataset.index].Gap
        );
      }
    } else if (event.target.label == "Practice/Employer Name") {
      this.workHistoryArray[event.currentTarget.dataset.index].Name =
        event.detail.value;
    } else if (event.target.label == "Title") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__JobTitle__c = event.detail.value;
    } else if (event.target.label == "Start Date") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__StartDate__c = event.detail.value;
    } else if (event.target.label == "End Date") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__EndDate__c = event.detail.value;
    } else if (event.target.label == "Current Employer") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__IsCurrentEmployer__c = event.target.checked;
    } else if (event.target.label == "Address") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__AddressLine1__c = event.detail.value;
    } else if (event.target.label == "Address Line 2") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__AddressLine2__c = event.detail.value;
    } else if (event.target.label == "City") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__AddressCity__c = event.detail.value;
    } else if (event.target.label == "State") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__AddressState__c = event.detail.value;
    } else if (event.target.label == "Zip Code") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__AddressZip__c = event.detail.value;
    } else if (event.target.label == "Reason for Departure (if applicable)") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__DepartureReason__c = event.detail.value;
    } else if (event.target.label == "Gap Explanation") {
      this.workHistoryArray[
        event.currentTarget.dataset.index
      ].verifiable__GapExplanation__c = event.detail.value;
    }
  }

  /*Invokes on click of Add Work History Button */
  addWorkHistory() {
    this.workHistoryArray.push({
      Id: "",
      verifiable__Type__c: "",
      Name: "",
      verifiable__JobTitle__c: "",
      verifiable__StartDate__c: undefined,
      verifiable__EndDate__c: undefined,
      verifiable__IsCurrentEmployer__c: false,
      verifiable__AddressLine1__c: "",
      verifiable__AddressLine2__c: "",
      verifiable__AddressCity__c: "",
      verifiable__AddressState__c: "",
      verifiable__AddressZip__c: "",
      verifiable__DepartureReason__c: "",
      verifiable__GapExplanation__c: "",
      Gap: false
    });
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeWorkHistory(event) {
    console.log(event.currentTarget.dataset.id);
    let index = event.currentTarget.dataset.index;
    if (this.workHistoryArray[index].Id != "") {
      this.recordsToDelete.push(this.workHistoryArray[index].Id);
    }
    this.workHistoryArray.splice(index, 1);
  }

  /*Retrieves the object records */
  async retrieveRecord() {
    try {
      this.loaded = false;
      const relatedrecordsresponse = await getProvidersRelatedWorkHistory({
        recId: this.recordId,
        fields: RELATED_RECORDS_FIELDS.toString(),
        sObjectName: "verifiable__WorkHistory__c",
        relationshipField: "verifiable__Provider__c"
      });
      console.log("548", relatedrecordsresponse);
      if (relatedrecordsresponse.length > 0) {
        let parseRecords = [];
        relatedrecordsresponse.forEach((e, index) => {
          let parseObject = {};
          parseObject.Id = e.Id;
          parseObject.verifiable__Type__c = e.verifiable__Type__c;
          if (e.verifiable__Type__c == "Employment") {
            parseObject.Name = e.Name;
            parseObject.verifiable__JobTitle__c = e.verifiable__JobTitle__c;
            parseObject.verifiable__StartDate__c = e.verifiable__StartDate__c;
            parseObject.verifiable__EndDate__c = e.verifiable__EndDate__c;
            parseObject.verifiable__IsCurrentEmployer__c =
              e.verifiable__IsCurrentEmployer__c;
            parseObject.verifiable__AddressLine1__c =
              e.verifiable__AddressLine1__c;
            parseObject.verifiable__AddressLine2__c =
              e.verifiable__AddressLine2__c;
            parseObject.verifiable__AddressCity__c =
              e.verifiable__AddressCity__c;
            parseObject.verifiable__AddressState__c =
              e.verifiable__AddressState__c;
            parseObject.verifiable__AddressZip__c = e.verifiable__AddressZip__c;
            parseObject.verifiable__DepartureReason__c =
              e.verifiable__DepartureReason__c;
            parseObject.Gap = false;
            parseRecords.push(parseObject);
          } else {
            parseObject.verifiable__StartDate__c = e.verifiable__StartDate__c;
            parseObject.verifiable__EndDate__c = e.verifiable__EndDate__c;
            parseObject.verifiable__GapExplanation__c =
              e.verifiable__GapExplanation__c != undefined
                ? e.verifiable__GapExplanation__c
                : undefined;
            parseObject.Gap = true;
            parseRecords.push(parseObject);
            //this.gap = true;
          }
        });
        console.log("557", parseRecords);
        this.workHistoryArray = [...parseRecords];
        console.log("558", this.workHistoryArray);
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: {
            retreived: true,
            data: this.recordId,
            stepname: "workHistory"
          }
        })
      );
      this.loaded = true;
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "workHistory" }
        })
      );
      this.loaded = true;
    }
  }

  /*Saves/Create the record */
  async saveRecord() {
    try {
      this.loaded = false;
      let flag = true;
      let recordArray = [];
      this.workHistoryArray.forEach((e) => {
        if (
          e.verifiable__StartDate__c >= new Date().toISOString().slice(0, 10)
        ) {
          let target = this.template.querySelector(`[data-id="StartDate"]`);
          target.focus();
          target.setCustomValidity("Invalid Date");
          this.loaded = true;
          target.reportValidity();
          this.dispatchEvent(
            new CustomEvent("stepcompletionevent", {
              detail: {
                isCompleted: false,
                data: undefined,
                stepname: "workHistory"
              }
            })
          );
          flag = false;
          return;
        }

        let dataProcessObject = {};
        if (e.Gap) {
          console.log(e.verifiable__GapExplanation__c);
          dataProcessObject =
            e.Id != ""
              ? e
              : {
                verifiable__Type__c: e.verifiable__Type__c,
                verifiable__StartDate__c: e.verifiable__StartDate__c,
                verifiable__EndDate__c: e.verifiable__EndDate__c,
                verifiable__GapExplanation__c: e.verifiable__GapExplanation__c
              };
          dataProcessObject.verifiable__Provider__c = !(
            e.Id == "" &&
            e.verifiable__StartDate__c == undefined &&
            e.verifiable__EndDate__c == undefined &&
            e.verifiable__GapExplanation__c == ""
          )
            ? this.recordId
            : undefined;
        } else {
          dataProcessObject =
            e.Id != ""
              ? e
              : {
                verifiable__Type__c: e.verifiable__Type__c,
                Name: e.Name,
                verifiable__JobTitle__c: e.verifiable__JobTitle__c,
                verifiable__StartDate__c: e.verifiable__StartDate__c,
                verifiable__EndDate__c: e.verifiable__EndDate__c,
                verifiable__IsCurrentEmployer__c:
                  e.verifiable__IsCurrentEmployer__c,
                verifiable__AddressLine1__c: e.verifiable__AddressLine1__c,
                verifiable__AddressLine2__c: e.verifiable__AddressLine2__c,
                verifiable__AddressCity__c: e.verifiable__AddressCity__c,
                verifiable__AddressState__c: e.verifiable__AddressState__c,
                verifiable__AddressZip__c: e.verifiable__AddressZip__c,
                verifiable__DepartureReason__c:
                  e.verifiable__DepartureReason__c,
                verifiable__GapExplanation__c: e.verifiable__GapExplanation__c
              };
          dataProcessObject.verifiable__Provider__c = !(
            e.Id == "" &&
            e.verifiable__Type__c == "" &&
            e.Name == "" &&
            e.verifiable__JobTitle__c == "" &&
            e.verifiable__StartDate__c == undefined &&
            e.verifiable__EndDate__c == undefined &&
            e.verifiable__IsCurrentEmployer__c == false &&
            e.verifiable__AddressLine1__c == "" &&
            e.verifiable__AddressLine2__c == "" &&
            e.verifiable__AddressCity__c == "" &&
            e.verifiable__AddressState__c == "" &&
            e.verifiable__AddressZip__c == "" &&
            e.verifiable__DepartureReason__c == ""
          )
            ? this.recordId
            : undefined;
        }

        if(!(e.Id == "" && e.verifiable__Type__c == '' && e.Name == '' && e.verifiable__JobTitle__c == '' && e.verifiable__StartDate__c == undefined && e.verifiable__EndDate__c == undefined && e.verifiable__IsCurrentEmployer__c == false && e.verifiable__AddressLine1__c == '' && e.verifiable__AddressLine2__c == '' &&  e.verifiable__AddressCity__c == '' && e.verifiable__AddressState__c == '' && e.verifiable__AddressZip__c == '' && e.verifiable__DepartureReason__c == '' && e.verifiable__GapExplanation__c == '')){
          recordArray.push(dataProcessObject);
        }
        // dataProcessObject.verifiable__Provider__c = this.recordId;
      });
      console.log("581", recordArray);
      if (flag) {
        if (!(recordArray.length == 0 && this.recordsToDelete.length == 0)) {
          await insertWorkHistoryRecords({
            sObjectData: JSON.stringify(recordArray).toString(),
            recordsToDelete: JSON.stringify(this.recordsToDelete).toString(),
            sObjectName: "verifiable__WorkHistory__c"
          });
        }
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "workHistory"
            }
          })
        );
      }
    } catch (error) {
      console.log(error);
      if (error.body.message.includes("verifiable.WorkHistoriesTrigger")) {
        const event = new ShowToastEvent({
          title: "Error",
          variant: "error",
          message: error.body.message
        });
        this.dispatchEvent(event);
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "workHistory"
            }
          })
        );
      } else {
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: false,
              data: undefined,
              stepname: "workHistory"
            }
          })
        );
      }
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
          if (message.stepName == "workHistory") {
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