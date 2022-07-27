import { api, LightningElement, track, wire } from "lwc";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import insertEducationRecords from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getRelatedEducationRecords from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import SchoolListJson from "@salesforce/resourceUrl/SchoolsListJson";
import EducationTypeJson from "@salesforce/resourceUrl/EducationTypeJson";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

// Education Object Fields
const RELATED_RECORDS_FIELDS = [
  "Id",
  "verifiable__GraduateType__c",
  "verifiable__Degree__c",
  "Name",
  "verifiable__SchoolCode__c",
  "verifiable__StartDate__c",
  "verifiable__EndDate__c",
  "verifiable__Completed__c",
  "verifiable__EcfmgNumber__c",
  "verifiable__EcfmgIssueDate__c"
];

export default class Education extends LightningElement {
  @api recordId; // recordId of contact
  @track ECFMGCheckbox = false; // ECFMG checkbox check
  @track ECFMGCNumber; // store ECFMG Number value
  @track ECFMGCDate; // store ECFMG Date value
  subscription = null; // subscribe variable
  recordsToDelete = []; // array of records to delete
  @track schoolsArray;
  @track EducationTypeList = []; // variable to store the picklist values
  @track loaded = true; // spinner visibility dependency
  comboboxClass =
    "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click";
  @track educationArray = [
    {
      Id: "",
      verifiable__GraduateType__c: "Professional",
      verifiable__Degree__c: "",
      Name: "",
      otherSchool: false,
      verifiable__SchoolCode__c: "",
      verifiable__StartDate__c: undefined,
      verifiable__EndDate__c: undefined,
      verifiable__Completed__c: false,
      isSelected: false,
      comboboxClass: this.comboboxClass
    }
  ]; // save the response
  filteredSchoolsArray;
  blurTimeout;
  schoolCode = false;

  @wire(MessageContext)
  messageContext;

  get professionalEducationOptions() {
    return [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" }
    ];
  }

  // get showClass() {
  //     var classString = 'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';
  //     if (this.this.isDropdownOpen) {
  //         return classString + ' slds-is-open';
  //     }
  //     else {
  //         return classString;
  //     }
  // }

  connectedCallback() {
    /*Static Resource call for Education Type combobox field */
    let request = new XMLHttpRequest();
    request.open("GET", EducationTypeJson, false);
    request.send(null);
    this.EducationTypeList = JSON.parse(request.responseText);

    /*Static Resource call for School List combobox field */
    let requestforSchoolList = new XMLHttpRequest();
    requestforSchoolList.open("GET", SchoolListJson, false);
    requestforSchoolList.send(null);
    this.schoolsArray = JSON.parse(requestforSchoolList.responseText);
    console.log(this.schoolsArray);
    this.filteredSchoolsArray = this.schoolsArray;
    this.subscribeToMessageChannel();
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  // ECFMG Checkbox handler
  handleECFMGNumberChange() {
    this.ECFMGCheckbox = !this.ECFMGCheckbox;
  }

  openDropdown(event) {
    this.educationArray[event.currentTarget.dataset.index].comboboxClass +=
      " slds-is-open";
  }

  closeDropdown(event) {
    let index = event.currentTarget.dataset.index;
    this.blurTimeout = setTimeout(() => {
      this.educationArray[index].comboboxClass = this.comboboxClass;
      this.filteredSchoolsArray = this.schoolsArray;
    }, 300);
  }

  searchHandler(event) {
    let enteredString = event.target.value.trim();
    if (enteredString !== "") {
      let searchString = enteredString.toLowerCase();
      this.filteredSchoolsArray = this.schoolsArray.filter(
        (e) =>
          e.value.toLowerCase().startsWith(searchString) ||
          e.value
            .toLowerCase()
            .split(" ")
            .filter((e1) => e1.startsWith(searchString)).length > 0
      );
    } else {
      this.filteredSchoolsArray = this.schoolsArray;
    }
  }

  handleRemoveSelected(event) {
    this.educationArray[event.currentTarget.dataset.index].Name = "";
    this.educationArray[
      event.currentTarget.dataset.index
    ].verifiable__SchoolCode__c = "";
    this.educationArray[event.currentTarget.dataset.index].isSelected = false;
  }

  /*Handles the onchange of every input fields */
  handleInputBoxChange(event) {
    if (event.target.label == "ECFMG Number") {
      this.ECFMGCNumber = event.detail.value;
    } else if (event.target.label == "Issue Date") {
      this.ECFMGCDate = event.detail.value;
    } else if (event.target.label == "Education Type") {
      this.educationArray[
        event.currentTarget.dataset.index
      ].verifiable__GraduateType__c = event.detail.value;
    } else if (event.target.label == "Degree Awarded") {
      this.educationArray[
        event.currentTarget.dataset.index
      ].verifiable__Degree__c = event.detail.value;
    } else if (
      event.currentTarget.dataset.label == "Name of U.S/Canadian School"
    ) {
      this.educationArray[event.currentTarget.dataset.index].Name =
        event.currentTarget.dataset.value;
      this.educationArray[
        event.currentTarget.dataset.index
      ].verifiable__SchoolCode__c = event.currentTarget.dataset.schoolcode;
      if (this.blurTimeout) {
        clearTimeout(this.blurTimeout);
      }
      this.educationArray[event.currentTarget.dataset.index].comboboxClass =
        this.comboboxClass;
      this.educationArray[event.currentTarget.dataset.index].isSelected = true;
      this.filteredSchoolsArray = this.schoolsArray;
      console.log(this.educationArray);
    } else if (event.target.label == "Other (Not listed)") {
      this.educationArray[event.currentTarget.dataset.index].Name = undefined;
      this.educationArray[
        event.currentTarget.dataset.index
      ].verifiable__SchoolCode__c = undefined;
      this.educationArray[event.currentTarget.dataset.index].otherSchool =
        event.target.checked;
      this.educationArray[event.currentTarget.dataset.index].isSelected = false;
    } else if (event.target.label == "Other Name of U.S/Canadian School") {
      this.educationArray[event.currentTarget.dataset.index].Name =
        event.detail.value;
    } else if (event.target.label == "Start Date") {
      this.educationArray[
        event.currentTarget.dataset.index
      ].verifiable__StartDate__c = event.detail.value;
    } else if (event.target.label == "End Date") {
      this.educationArray[
        event.currentTarget.dataset.index
      ].verifiable__EndDate__c = event.detail.value;
    } else if (
      event.target.label ==
      "Did you completed your professional education at this school ?"
    ) {
      this.educationArray[
        event.currentTarget.dataset.index
      ].verifiable__Completed__c = event.detail.value;
    }
  }

  /*Invokes on click of Add Education Button */
  addEducation() {
    this.educationArray.push({
      Id: "",
      verifiable__GraduateType__c: "Professional",
      verifiable__Degree__c: "",
      Name: "",
      otherSchool: false,
      verifiable__SchoolCode__c: "",
      verifiable__StartDate__c: undefined,
      verifiable__EndDate__c: undefined,
      verifiable__Completed__c: false,
      isSelected: false,
      comboboxClass: this.comboboxClass
    });
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeEducation(event) {
    const index = event.currentTarget.dataset.index;
    if (this.educationArray[index].Id != "") {
      this.recordsToDelete.push(this.educationArray[index].Id);
    }
    this.educationArray.splice(index, 1);
  }

  /*Retrieves the object records */
  async retrieveRecord() {
    try {
      this.loaded = false;
      const relatedrecordsresponse = await getRelatedEducationRecords({
        recId: this.recordId,
        fields: RELATED_RECORDS_FIELDS.toString(),
        sObjectName: "verifiable__Education__c",
        relationshipField: "verifiable__Provider__c"
      });
      console.log("491", relatedrecordsresponse);
      if (relatedrecordsresponse.length > 0) {
        let parseRecords = [];
        relatedrecordsresponse.forEach((e, index) => {
          console.log("115", e);
          let parseObject = {};
          parseObject.Id = e.Id;
          parseObject.verifiable__GraduateType__c =
            e.verifiable__GraduateType__c;
          parseObject.verifiable__Degree__c = e.verifiable__Degree__c;
          parseObject.verifiable__StartDate__c =
            e.verifiable__StartDate__c != undefined
              ? e.verifiable__StartDate__c
              : undefined;
          parseObject.verifiable__EndDate__c =
            e.verifiable__EndDate__c != undefined
              ? e.verifiable__EndDate__c
              : undefined;
          parseObject.verifiable__Completed__c =
            e.verifiable__Completed__c != undefined
              ? e.verifiable__Completed__c == true
                ? "Yes"
                : "No"
              : undefined;
          const school = this.schoolsArray.find((k) => k.value == e.Name);
          if (school != undefined) {
            parseObject.Name = school.value;
            parseObject.verifiable__SchoolCode__c = school.schoolcode;
          } else if (school == undefined) {
            parseObject.otherSchool = true;
            parseObject.Name = e.Name;
            parseObject.verifiable__SchoolCode__c = undefined;
          }

          if (
            e.verifiable__EcfmgNumber__c != undefined ||
            e.verifiable__EcfmgIssueDate__c != undefined
          ) {
            this.ECFMGCheckbox = true;
            this.ECFMGCNumber = e.verifiable__EcfmgNumber__c;
            this.ECFMGCDate = e.verifiable__EcfmgIssueDate__c;
          }

          parseObject.isSelected = parseObject.otherSchool ? false : true;
          parseObject.comboboxClass = this.comboboxClass;
          parseRecords.push(parseObject);
        });
        console.log("557", parseRecords);
        this.educationArray = [...parseRecords];
        console.log("558", this.educationArray);
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: {
            retreived: true,
            data: this.recordId,
            stepname: "education"
          }
        })
      );
      this.loaded = true;
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "education" }
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
      console.log("499", this.educationArray);
      console.log("500", this.ECFMGCheckbox);
      console.log("501", this.ECFMGCNumber);
      console.log("502", this.ECFMGCDate);
      let eduArrayCloned = [...this.educationArray];
      let records = [];
      if (eduArrayCloned.length > 0) {
        eduArrayCloned.forEach((e) => {
          let tempObj = { ...e };
          console.log("166", tempObj);

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
                  stepname: "education"
                }
              })
            );
            flag = false;
            return;
          }

          tempObj.verifiable__Completed__c =
            e.verifiable__Completed__c != undefined
              ? e.verifiable__Completed__c == "Yes"
                ? true
                : false
              : undefined;
          tempObj.verifiable__StartDate__c = e.verifiable__StartDate__c
            ? new Date(e.verifiable__StartDate__c).toISOString().split("T")[0]
            : undefined;
          tempObj.verifiable__EndDate__c = e.verifiable__EndDate__c
            ? new Date(e.verifiable__EndDate__c).toISOString().split("T")[0]
            : undefined;
          delete tempObj.otherSchool;

          if (this.ECFMGCheckbox == true) {
            tempObj.verifiable__EcfmgNumber__c = this.ECFMGCNumber;
            tempObj.verifiable__EcfmgIssueDate__c =
              this.ECFMGCDate != undefined
                ? new Date(this.ECFMGCDate).toISOString().split("T")[0]
                : undefined;
          } else if (this.ECFMGCheckbox == false) {
            tempObj.verifiable__EcfmgNumber__c = null;
            tempObj.verifiable__EcfmgIssueDate__c = null;
            this.ECFMGCDate = undefined;
            this.ECFMGCNumber = undefined;
          }
          if (tempObj.Id == "") {
            delete tempObj.Id;
          }
          if (
            !(
              e.Id == "" &&
              e.verifiable__GraduateType__c == "" &&
              e.verifiable__Degree__c == "" &&
              e.Name == "" &&
              e.verifiable__SchoolCode__c == "" &&
              e.verifiable__StartDate__c == undefined &&
              e.verifiable__EndDate__c == undefined &&
              e.verifiable__Completed__c == false
            )
          ) {
            console.log("items to upsert");
            tempObj.verifiable__Provider__c = this.recordId;
            records.push(tempObj);
          }
        });
      } else {
        let tempObj = {};
        if (this.ECFMGCheckbox == true) {
          tempObj.verifiable__EcfmgNumber__c = this.ECFMGCNumber;
          tempObj.verifiable__EcfmgIssueDate__c =
            this.ECFMGCDate != undefined
              ? new Date(this.ECFMGCDate).toISOString().split("T")[0]
              : undefined;
          tempObj.verifiable__Provider__c = this.recordId;
          tempObj.Name = "ECFMG Certificate";
          records.push(tempObj);
        } else if (this.ECFMGCheckbox == false) {
          tempObj.verifiable__EcfmgNumber__c = null;
          tempObj.verifiable__EcfmgIssueDate__c = null;
          this.ECFMGCDate = undefined;
          this.ECFMGCNumber = undefined;
        }
      }

      console.log("parsed response", records);
      if (flag) {
        if (!(records.length == 0 && this.recordsToDelete.length == 0)) {
          await insertEducationRecords({
            sObjectData: JSON.stringify(records).toString(),
            recordsToDelete: JSON.stringify(this.recordsToDelete).toString(),
            sObjectName: "verifiable__Education__c"
          });
          this.recordsToDelete = [];
        }
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "education"
            }
          })
        );
        this.loaded = true;
      }
    } catch (error) {
      console.log(error);
      if (error.body.message.includes("verifiable.EducationsTrigger")) {
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
              stepname: "education"
            }
          })
        );
      } else {
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: false,
              data: undefined,
              stepname: "education"
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
          if (message.stepName == "education") {
            console.log(message);
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
