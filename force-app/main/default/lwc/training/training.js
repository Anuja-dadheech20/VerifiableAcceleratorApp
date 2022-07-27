import { LightningElement, track, api, wire } from "lwc";
import insertTrainingRecords from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getProvidersRelatedTraining from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import TrainingTypeJson from "@salesforce/resourceUrl/TrainingTypeJson";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

//Training Object Fields
const RELATED_RECORDS_FIELDS = [
  "Id",
  "verifiable__TrainingType__c",
  "Name",
  "verifiable__SchoolName__c",
  "verifiable__StartDate__c",
  "verifiable__EndDate__c",
  "verifiable__Completed__c"
];

export default class Training extends LightningElement {
  @api recordId; //contact recordId
  @track loaded = true; // spinner visibility dependency
  recordsToDelete = []; // array of records to delete
  subscription = null; // subscribe variable
  @track TrainingTypeList = []; // variable to store the picklist values
  @track trainingArray = [
    {
      Id: "",
      verifiable__TrainingType__c: "",
      Name: "",
      verifiable__SchoolName__c: "",
      verifiable__StartDate__c: undefined,
      verifiable__EndDate__c: undefined,
      verifiable__Completed__c: false
    }
  ]; // save the response

  @wire(MessageContext)
  messageContext;

  // Radio group options
  get options() {
    return [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" }
    ];
  }

  connectedCallback() {
    /*Static Resource call for State combobox field */
    let request = new XMLHttpRequest();
    request.open("GET", TrainingTypeJson, false);
    request.send(null);
    this.TrainingTypeList = JSON.parse(request.responseText);

    this.subscribeToMessageChannel();
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  /*Handles the onchange of every input fields */
  handleInputBoxChange(event) {
    if (event.target.label == "Training Type") {
      this.trainingArray[
        event.currentTarget.dataset.index
      ].verifiable__TrainingType__c = event.detail.value;
    } else if (event.target.label == "Institution/Hospital Name") {
      this.trainingArray[event.currentTarget.dataset.index].Name =
        event.detail.value;
    } else if (event.target.label == "Affiliated School") {
      this.trainingArray[
        event.currentTarget.dataset.index
      ].verifiable__SchoolName__c = event.detail.value;
    } else if (event.target.label == "Start Date") {
      this.trainingArray[
        event.currentTarget.dataset.index
      ].verifiable__StartDate__c = event.detail.value;
    } else if (event.target.label == "End Date") {
      this.trainingArray[
        event.currentTarget.dataset.index
      ].verifiable__EndDate__c = event.detail.value;
    } else if (
      event.target.label ==
      "Did you complete this training program at this institution?"
    ) {
      this.trainingArray[
        event.currentTarget.dataset.index
      ].verifiable__Completed__c = event.target.value;
    }
  }

  /*Invokes on click of Add Training Button */
  addTraining() {
    this.trainingArray.push({
      Id: "",
      verifiable__TrainingType__c: "",
      Name: "",
      verifiable__SchoolName__c: "",
      verifiable__StartDate__c: undefined,
      verifiable__EndDate__c: undefined,
      verifiable__Completed__c: false
    });
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeTraining(event) {
    console.log(event.currentTarget.dataset.index);
    let index = event.currentTarget.dataset.index;
    if (this.trainingArray[index].Id != "") {
      this.recordsToDelete.push(this.trainingArray[index].Id);
    }
    this.trainingArray.splice(index, 1);
  }

  /*Retrieves the object records */
  async retrieveRecord() {
    try {
      this.loaded = false;
      const relatedrecordsresponse = await getProvidersRelatedTraining({
        recId: this.recordId,
        fields: RELATED_RECORDS_FIELDS.toString(),
        sObjectName: "verifiable__Training__c",
        relationshipField: "verifiable__Provider__c"
      });
      console.log("88", relatedrecordsresponse);
      if (relatedrecordsresponse.length > 0) {
        let parseRecords = [];
        relatedrecordsresponse.forEach((e, index) => {
          let parseObject = {};
          parseObject.Id = e.Id;
          parseObject.verifiable__TrainingType__c =
            e.verifiable__TrainingType__c;
          parseObject.Name = e.Name;
          parseObject.verifiable__SchoolName__c = e.verifiable__SchoolName__c;
          parseObject.verifiable__StartDate__c = e.verifiable__StartDate__c;
          parseObject.verifiable__EndDate__c = e.verifiable__EndDate__c;
          parseObject.verifiable__Completed__c =
            e.verifiable__Completed__c != undefined
              ? e.verifiable__Completed__c == true
                ? "Yes"
                : "No"
              : undefined;
          parseRecords.push(parseObject);
        });
        console.log("102", parseRecords);
        this.trainingArray = [...parseRecords];
        console.log("104", this.trainingArray);
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: true, data: this.recordId, stepname: "training" }
        })
      );
      this.loaded = true;
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "training" }
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
      let trainingArrayCloned = [...this.trainingArray];
      let recordArray = [];
      if (trainingArrayCloned.length > 0) {
        trainingArrayCloned.forEach((e) => {
          let dataProcessObject = { ...e };

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
                  stepname: "training"
                }
              })
            );
            flag = false;
            return;
          }

          dataProcessObject.verifiable__Completed__c =
            e.verifiable__Completed__c != undefined
              ? e.verifiable__Completed__c == "Yes"
                ? true
                : false
              : undefined;
          if (dataProcessObject.Id == "") {
            delete dataProcessObject.Id;
          }
          if (
            !(
              e.Id == "" &&
              e.verifiable__TrainingType__c == "" &&
              e.Name == "" &&
              e.verifiable__SchoolName__c == "" &&
              e.verifiable__StartDate__c == undefined &&
              e.verifiable__EndDate__c == undefined
            )
          ) {
            dataProcessObject.verifiable__Provider__c = this.recordId;
            recordArray.push(dataProcessObject);
          }
        });
      }
      // this.trainingArray.forEach((e) => {
      //   let dataProcessObject = e.Id != "" ? e : { verifiable__TrainingType__c: e.verifiable__TrainingType__c, Name: e.Name, verifiable__SchoolName__c: e.verifiable__SchoolName__c, verifiable__StartDate__c: e.verifiable__StartDate__c , verifiable__EndDate__c: e.verifiable__StartDate__c , verifiable__Completed__c: e.verifiable__Completed__c };
      //   if(!(e.Id == "" && e.verifiable__TrainingType__c == '' && e.Name == '' && e.verifiable__SchoolName__c == '' && e.verifiable__StartDate__c == undefined && e.verifiable__EndDate__c == undefined && e.verifiable__Completed__c == false)){
      //     dataProcessObject.verifiable__Provider__c = this.recordId;
      //     recordArray.push(dataProcessObject);
      //   }
      // })
      console.log("128", recordArray);
      if (flag) {
        if (!(recordArray.length == 0 && this.recordsToDelete.length == 0)) {
          await insertTrainingRecords({
            sObjectData: JSON.stringify(recordArray).toString(),
            recordsToDelete: JSON.stringify(this.recordsToDelete).toString(),
            sObjectName: "verifiable__Training__c"
          });
        }
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "training"
            }
          })
        );
      }
    } catch (error) {
      console.log(error);
      if (error.body.message.includes("verifiable.TrainingsTrigger")) {
        // const event = new ShowToastEvent({
        //     title: 'Error',
        //     variant : 'error',
        //     message: error.body.message,
        // });
        // this.dispatchEvent(event);
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "training"
            }
          })
        );
      } else {
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: false,
              data: undefined,
              stepname: "training"
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
          if (message.stepName == "training") {
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