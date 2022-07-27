import { LightningElement, track, api, wire } from "lwc";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import insertDisclosureQuestionRecords from "@salesforce/apex/ProviderApplicationFormController.saveDisclosureRecords";
import DisclosureQuestionJson from "@salesforce/resourceUrl/DisclosureQuestionJson";

export default class DisclosureQuestions extends LightningElement {
  @api recordId; //contact recordId
  @track loaded = true; // spinner visibility dependency
  subscription = null; //subscribe variable
  @track questionAnswersArray = [
    { Question: "", Description: "", Answer: "", Response: "" }
  ];

  @wire(MessageContext)
  messageContext;

  connectedCallback() {
    this.loaded = false;
    let request = new XMLHttpRequest();
    request.open("GET", DisclosureQuestionJson, false);
    request.send(null);
    let response = JSON.parse(request.responseText);
    let parsedRecords = [];
    response.forEach((e) => {
      let parsedObject = {};
      parsedObject.Name = e.Question;
      parsedObject.Description = e.Description;
      parsedObject.Answer__c = e.Answer__c;
      parsedObject.Needs_Review__c = e.Response == "Yes" ? true : false;
      parsedObject.Response = e.Response;
      parsedRecords.push(parsedObject);
    });
    this.questionAnswersArray = [...parsedRecords];
    this.loaded = true;
    this.subscribeToMessageChannel();
  }

  get radioButtonOptions() {
    return [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" }
    ];
  }

  handleInputChange(event) {
    if (event.target.label == "Response ?") {
      this.questionAnswersArray[event.currentTarget.dataset.index].Response =
        event.detail.value;
      this.questionAnswersArray[
        event.currentTarget.dataset.index
      ].Needs_Review__c = event.detail.value == "Yes" ? true : false;
    } else if (event.target.label == "Please Explain") {
      this.questionAnswersArray[event.currentTarget.dataset.index].Answer__c =
        event.detail.value.trim();
    }
  }

  /*Saves/Create the record */
  async saveRecord() {
    try {
      this.loaded = false;
      let flag = true;
      console.log("records", this.questionAnswersArray);
      let parsedRecords = [];
      this.questionAnswersArray.forEach((e, index) => {
        if (e.Response == "Yes") {
          if (e.Answer__c == "" || e.Answer__c == undefined) {
            let target = this.template.querySelector(`[data-id="${index}"]`);
            target.setCustomValidity("Complete this field");
            this.loaded = true;
            target.reportValidity();
            this.dispatchEvent(
              new CustomEvent("stepcompletionevent", {
                detail: {
                  isCompleted: false,
                  data: undefined,
                  stepname: "disclosurequestion"
                }
              })
            );
            flag = false;
            return;
          } else {
            let parsedObject = { ...e };
            // delete parsedObject.Description;
            // delete parsedObject.Response;
            parsedRecords.push(parsedObject);
          }
        }
      });
      console.log("parsed records", parsedRecords);
      console.log(JSON.stringify(parsedRecords).toString());
      console.log(JSON.stringify(parsedRecords));
      if (flag) {
        if (parsedRecords.length > 0) {
          console.log("r", this.recordId);
          await insertDisclosureQuestionRecords({
            sObjectData: JSON.stringify(parsedRecords),
            contactId: this.recordId
          });
        }
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "disclosurequestion"
            }
          })
        );
      }
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: {
            isCompleted: false,
            data: undefined,
            stepname: "disclosurequestion"
          }
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
          console.log("79", message);
          if (message.stepName == "disclosurequestion") {
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