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

  // Board Certification Name field JSON
  // get BoardCertificationNames() {
  //     return [
  //         { label: "American Board of Medical Specialties", value: "American Board of Medical Specialties" },
  //         { label: "National Board for Certified Counselors", value: "National Board for Certified Counselors" },
  //         { label: "American Board of Clinical Social Work", value: "American Board of Clinical Social Work" },
  //         { label: "American Speech-Language-Hearing Association", value: "American Speech-Language-Hearing Association" },
  //         { label: "American Nurses Credentialing Center", value: "American Nurses Credentialing Center" },
  //         { label: "American Academy of Nurse Practitioners", value: "American Academy of Nurse Practitioners" },
  //         { label: "American Osteopathic Association", value: "American Osteopathic Association" },
  //         { label: "American Medical Association", value: "American Medical Association" },
  //         { label: "National Board of Certification and Recertification for Nurse Anesthetists", value: "National Board of Certification and Recertification for Nurse Anesthetists" },
  //         { label: "American Association of Critical Care Nurses", value: "American Association of Critical Care Nurses" },
  //         { label: "American Midwifery Certification Board", value: "American Midwifery Certification Board" },
  //         { label: "American Board of Podiatric Medicine", value: "American Board of Podiatric Medicine" },
  //         { label: "American Board of Oral Implantology", value: "American Board of Oral Implantology" },
  //         { label: "American Board of Oral Medicine", value: "American Board of Oral Medicine" },
  //         { label: "American Board of Orofacial Pain", value: "American Board of Orofacial Pain" },
  //         { label: "American Dental Board of Anesthesiology", value: "American Dental Board of Anesthesiology" },
  //         { label: "American Board of Dental Public Health", value: "American Board of Dental Public Health" },
  //         { label: "American Board of Pediatric Dentistry", value: "American Board of Pediatric Dentistry" },
  //         { label: "American Board of Periodontology", value: "American Board of Periodontology" },
  //         { label: "American Board of Internal Medicine", value: "American Board of Internal Medicine" },
  //         { label: "National Commission on Certification of Physician Assistants", value: "National Commission on Certification of Physician Assistants" },
  //         { label: "American Board of Allergy and Immunology", value: "American Board of Allergy and Immunology" },
  //         { label: "American Board of Anesthesiology", value: "American Board of Anesthesiology" },
  //         { label: "American Board of Colon and Rectal Surgery", value: "American Board of Colon and Rectal Surgery" },
  //         { label: "American Board of Dermatology", value: "American Board of Dermatology" },
  //         { label: "American Board of Emergency Medicine", value: "American Board of Emergency Medicine" },
  //         { label: "American Board of Family Medicine", value: "American Board of Family Medicine" },
  //         { label: "American Board of Genetics and Genomics", value: "American Board of Genetics and Genomics" },
  //         { label: "American Board of Neurological Surgery", value: "American Board of Neurological Surgery" },
  //         { label: "American Board of Nuclear Medicine", value: "American Board of Nuclear Medicine" },
  //         { label: "American Board of Obstetrics and Gynecology", value: "American Board of Obstetrics and Gynecology" },
  //         { label: "American Board of Ophthalmology", value: "American Board of Ophthalmology" },
  //         { label: "American Board of Orthopaedic Surgery", value: "American Board of Orthopaedic Surgery" },
  //         { label: "American Board of Otolaryngology - Head and Neck Surgery", value: "American Board of Otolaryngology - Head and Neck Surgery" },
  //         { label: "American Board of Pathology", value: "American Board of Pathology" },
  //         { label: "American Board of Pediatrics", value: "American Board of Pediatrics" },
  //         { label: "American Board of Physical Medicine and Rehabilitation", value: "American Board of Physical Medicine and Rehabilitation" },
  //         { label: "American Board of Plastic Surgery", value: "American Board of Plastic Surgery" },
  //         { label: "American Board of Preventive Medicine", value: "American Board of Preventive Medicine" },
  //         { label: "American Board of Professional Psychology", value: "American Board of Professional Psychology" },
  //         { label: "American Board of Psychiatry and Neurology", value: "American Board of Psychiatry and Neurology" },
  //         { label: "American Board of Radiology", value: "American Board of Radiology" },
  //         { label: "American Board of Surgery", value: "American Board of Surgery" },
  //         { label: "American Board of Thoracic Surgery", value: "American Board of Thoracic Surgery" },
  //         { label: "American Board of Urology", value: "American Board of Urology" },
  //         { label: "American Optometric Association", value: "American Optometric Association" },
  //         { label: "Association of Social Work Boards", value: "Association of Social Work Boards" },
  //         { label: "American Board of Foot and Ankle Surgery", value: "American Board of Foot and Ankle Surgery" },
  //         { label: "AMERICAN BOARD OF ORAL &amp; MAXILLOFACIAL PATHOLOGY", value: "AMERICAN BOARD OF ORAL &amp; MAXILLOFACIAL PATHOLOGY" },
  //         { label: "AMERICAN BOARD OF ORAL &amp; MAXILLOFACIAL SURGERY", value: "AMERICAN BOARD OF ORAL &amp; MAXILLOFACIAL SURGERY" },
  //         { label: "AMERICAN BOARD OF ORTHODONTICS", value: "AMERICAN BOARD OF ORTHODONTICS" },
  //         { label: "AMERICAN BOARD OF ENDODONTICS", value: "AMERICAN BOARD OF ENDODONTICS" },
  //         { label: "AMERICAN BOARD OF PROSTHODONTICS", value: "AMERICAN BOARD OF PROSTHODONTICS" }
  //     ];
  // }

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
