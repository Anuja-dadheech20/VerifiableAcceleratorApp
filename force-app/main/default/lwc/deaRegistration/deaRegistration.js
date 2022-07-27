import { LightningElement, track, api, wire } from "lwc";
import insertDeaRecords from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getProvidersRelatedDea from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";

// DEA Number fields
const RELATED_RECORDS_FIELDS = ["Id", "Name"];

export default class DeaRegistration extends LightningElement {
  @api recordId; // Contact recordId
  @track loaded = true; // spinner visibility dependency
  subscription = null; // subscribe variable
  recordsToDelete = []; // array of records to delete
  @track deaRegistrationArray = [{ Id: "", Name: "" }]; // saves response
  dataid;

  @wire(MessageContext)
  messageContext;

  connectedCallback() {
    this.subscribeToMessageChannel();
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  /*Handles the onchange of every input fields */
  handleInputBoxChange(event) {
    if (event.target.label == "DEA Registration Number") {
      this.deaRegistrationArray[event.currentTarget.dataset.index].Name =
        event.detail.value;
      //this.deaRegistrationArray[event.currentTarget.dataset.index].tempId = parseInt(event.currentTarget.dataset.index);
    }
  }

  /*Invokes on click of Add DEA Button */
  addDea() {
    this.deaRegistrationArray.push({ Id: "", Name: "" });
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeDea(event) {
    console.log(event.currentTarget.dataset.index);
    let index = event.currentTarget.dataset.index;
    if (this.deaRegistrationArray[index].Id != "") {
      this.recordsToDelete.push(this.deaRegistrationArray[index].Id);
    }
    this.deaRegistrationArray.splice(index, 1);
  }

  /*Retreives the record*/
  async retrieveRecord() {
    try {
      this.loaded = false;
      const relatedrecordsresponse = await getProvidersRelatedDea({
        recId: this.recordId,
        fields: RELATED_RECORDS_FIELDS.toString(),
        sObjectName: "DEA_Number__c",
        relationshipField: "Provider__c"
      });
      console.log("548", relatedrecordsresponse);
      if (relatedrecordsresponse.length > 0) {
        let parseRecords = [];
        relatedrecordsresponse.forEach((e, index) => {
          let parseObject = {};
          parseObject.Id = e.Id;
          parseObject.Name = e.Name;
          //parseObject.tempId = index;
          parseRecords.push(parseObject);
        });
        console.log("557", parseRecords);
        this.deaRegistrationArray = [...parseRecords];
        console.log("558", this.deaRegistrationArray);
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: true, data: this.recordId, stepname: "dea" }
        })
      );
      this.loaded = true;
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "dea" }
        })
      );
      this.loaded = true;
    }
  }

  /* Saves the record */
  async saveRecord() {
    try {
      this.loaded = false;
      var flag = true;
      let recordArray = [];
      let deaRegistrationNames = this.deaRegistrationArray.map((e) => e.Name);
      this.deaRegistrationArray.forEach((e, index) => {
        console.log("88", e.Name);
        console.log("89", e.Id);
        let dataProcessObject = e.Id != "" ? e : { Name: e.Name };
        if (!(e.Id == "" && e.Name == "")) {
          let target = this.template.querySelector(`[data-id="${index}"]`);
          //console.log(target);
          // const dea = this.template.querySelector('lightning-input');
          // console.log('dea', dea);

          //let deaValue = target.value;
          const regex = /^[a-zA-Z]{2}[0-9]{7}$/;
          //console.log('hi', regex.test(deaValue));
          var deaNumber = target.value.toString();
          console.log("deainput", deaNumber);

          let val = [...deaNumber];
          console.log("@92 val := " + val);

          let validation1 = Number(val[2]) + Number(val[4]) + Number(val[6]);
          let validation2 = Number(val[3]) + Number(val[5]) + Number(val[7]);
          let validation3 = 2 * Number(validation2);
          let validation4 = Number(validation1) + Number(validation3);
          let validation4Array = [...validation4.toString()];
          let lastDigit = Number(validation4Array[validation4Array.length - 1]);
          let lastDigitOfNumber = Number(val[8]);

          console.log("validation1 = ", validation1);
          console.log("validation2 = ", validation2);
          console.log("validation3 = ", validation3);
          console.log("validation4 = ", validation4);
          console.log("lastDigit = ", lastDigit);
          console.log("lastDigitOfNumber = ", lastDigitOfNumber);
          if (!regex.test(target.value) || lastDigit !== lastDigitOfNumber) {
            console.log("If");
            // const event = new ShowToastEvent({
            //         title: 'Error',
            //         variant : 'error',
            //         message: 'Invalid DEA'
            //     });
            //     this.dispatchEvent(event);
            target.setCustomValidity("Invalid DEA Number");
            console.log("If1");
            this.loaded = true;
            target.reportValidity();
            this.dispatchEvent(
              new CustomEvent("stepcompletionevent", {
                detail: { isCompleted: false, data: undefined, stepname: "dea" }
              })
            );
            console.log("If3");
            flag = false;
            return;
          } else if (
            this.deaRegistrationArray.filter((e1) => e.Name == e1.Name)
              .length >= 2
          ) {
            target.setCustomValidity("Duplicate DEA Number");
            this.loaded = true;
            target.reportValidity();
            this.dispatchEvent(
              new CustomEvent("stepcompletionevent", {
                detail: { isCompleted: false, data: undefined, stepname: "dea" }
              })
            );
            flag = false;
          } else {
            target.setCustomValidity("");
            target.reportValidity();
          }

          dataProcessObject.Provider__c = this.recordId;
          console.log("data", dataProcessObject);
          recordArray.push(dataProcessObject);
        }
      });
      console.log("581", recordArray);

      if (flag === true) {
        if (!(this.recordsToDelete.length == 0 && recordArray.length == 0)) {
          await insertDeaRecords({
            sObjectData: JSON.stringify(recordArray).toString(),
            recordsToDelete: JSON.stringify(this.recordsToDelete).toString(),
            sObjectName: "DEA_Number__c"
          });
        }
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: { isCompleted: true, data: this.recordId, stepname: "dea" }
          })
        );
      }
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { retreived: false, data: undefined, stepname: "dea" }
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
          if (message.stepName == "dea") {
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
