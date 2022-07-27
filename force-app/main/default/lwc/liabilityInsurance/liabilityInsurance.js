import { LightningElement, track, api, wire } from "lwc";
import insertLiabilityInsuranceRecords from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getProvidersRelatedLiabilityInsurance from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import uploadFiles from "@salesforce/apex/LiabilityInsuranceFileUploader.uploadFiles";
import getFiles from "@salesforce/apex/LiabilityInsuranceFileUploader.getFiles";
import deleteFiles from "@salesforce/apex/LiabilityInsuranceFileUploader.deleteFiles";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

// Liability Insurance fields
const RELATED_RECORDS_FIELDS = [
  "Id",
  "verifiable__CoverageType__c",
  "Name",
  "verifiable__PolicyNumber__c",
  "verifiable__IsSelfInsured__c",
  "verifiable__OriginalEffectiveDate__c",
  "verifiable__CurrentEffectiveDate__c",
  "verifiable__CurrentExpirationDate__c",
  "verifiable__isUnlimitedCoverage__c",
  "verifiable__PolicyIncludesTailCoverage__c",
  "verifiable__OccurrenceCoverageAmount__c",
  "verifiable__AverageCoverageAmount__c"
];

export default class LiabilityInsurance extends LightningElement {
  @api recordId; //contact recordId
  @track loaded = true; //spinner visibility dependency
  recordsToDelete = []; // array of records to delete
  fileRecordToDelete = [];
  subscription = null; // subscribe variable
  @track liabilityInsuranceArray = [
    {
      Id: "",
      verifiable__CoverageType__c: "",
      Name: "",
      verifiable__PolicyNumber__c: "",
      verifiable__IsSelfInsured__c: false,
      verifiable__OriginalEffectiveDate__c: undefined,
      verifiable__CurrentEffectiveDate__c: undefined,
      verifiable__CurrentExpirationDate__c: undefined,
      verifiable__isUnlimitedCoverage__c: false,
      verifiable__PolicyIncludesTailCoverage__c: false,
      verifiable__OccurrenceCoverageAmount__c: "",
      verifiable__AverageCoverageAmount__c: "",
      CertificateOfInsurance: "",
      fileData: undefined
    }
  ]; //save response

  @wire(MessageContext)
  messageContext;

  connectedCallback() {
    this.subscribeToMessageChannel();
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  get optionsForRadioGroup() {
    return [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" }
    ];
  }

  get CoverageType() {
    return [
      { label: "Individual", value: "Individual" },
      { label: "Shared", value: "Shared" }
    ];
  }

  /* utility method to format file size*/
  bytesToSize(bytes) {
    let sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes == 0) return "0 Byte";
    let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
  }

  /* called when file is upload to handle its responses */
  openfileUpload(event) {
    const index = event.currentTarget.dataset.index;
    const file = event.target.files[0];
    let name = file.name;
    console.log("Name", name);
    if (
      name.includes(".pdf") ||
      name.includes(".doc") ||
      name.includes(".docx")
    ) {
      let reader = new FileReader();
      reader.onload = () => {
        console.log("62", reader.result);
        let base64 = reader.result.split(",")[1];
        const fileProcess = {
          ContentVersionId: undefined,
          ContentDocumentId: undefined,
          ContentDocumentLinkRecordId: undefined,
          Title: file.name,
          VersionData: base64,
          size: this.bytesToSize(file.size)
        };
        console.log(fileProcess);
        if (this.liabilityInsuranceArray[index].fileData != undefined) {
          if (
            this.liabilityInsuranceArray[index].fileData.ContentDocumentId !=
            undefined
          ) {
            this.fileRecordToDelete.push(
              this.liabilityInsuranceArray[index].fileData.ContentDocumentId
            );
          }
        }
        this.liabilityInsuranceArray[index].fileData = { ...fileProcess };
      };
      reader.readAsDataURL(file);
    } else {
      console.log("else");
      const event = new ShowToastEvent({
        title: "Error",
        variant: "error",
        message: "File Type not allowed"
      });
      this.dispatchEvent(event);
    }
  }

  /*Handles the onchange of every input fields */
  handleInputBoxChange(event) {
    if (event.target.label == "Coverage Type") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__CoverageType__c = event.detail.value;
    } else if (event.target.label == "Carrier Name") {
      this.liabilityInsuranceArray[event.currentTarget.dataset.index].Name =
        event.detail.value;
    } else if (event.target.label == "Policy Number") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__PolicyNumber__c = event.detail.value;
    } else if (event.target.label == "Self Insured ?") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__IsSelfInsured__c = event.detail.value;
    } else if (event.target.label == "Original Effective Date") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__OriginalEffectiveDate__c = event.detail.value;
    } else if (event.target.label == "Current Effective Date") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__CurrentEffectiveDate__c = event.detail.value;
    } else if (event.target.label == "Current Expiration Date") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__CurrentExpirationDate__c = event.detail.value;
    } else if (event.target.label == "Unlimited Coverage ?") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__isUnlimitedCoverage__c = event.detail.value;
    } else if (event.target.label == "Includes Tail Coverage ?") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__PolicyIncludesTailCoverage__c = event.detail.value;
    } else if (event.target.label == "Occurrence Coverage Amount") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__OccurrenceCoverageAmount__c = event.detail.value;
    } else if (event.target.label == "Aggregate Coverage Amount") {
      this.liabilityInsuranceArray[
        event.currentTarget.dataset.index
      ].verifiable__AverageCoverageAmount__c = event.detail.value;
    }
  }

  /*Invokes on click of Add License Button */
  addLiablityInsurance() {
    this.liabilityInsuranceArray.push({
      Id: "",
      verifiable__CoverageType__c: "",
      Name: "",
      verifiable__PolicyNumber__c: "",
      verifiable__IsSelfInsured__c: false,
      verifiable__OriginalEffectiveDate__c: undefined,
      verifiable__CurrentEffectiveDate__c: undefined,
      verifiable__CurrentExpirationDate__c: undefined,
      verifiable__isUnlimitedCoverage__c: false,
      verifiable__PolicyIncludesTailCoverage__c: false,
      verifiable__OccurrenceCoverageAmount__c: "",
      verifiable__AverageCoverageAmount__c: "",
      CertificateOfInsurance: "",
      fileData: undefined
    });
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeLiabilityInsurance(event) {
    console.log(event.currentTarget.dataset.index);
    let index = event.currentTarget.dataset.index;
    if (this.liabilityInsuranceArray[index].Id != "") {
      this.recordsToDelete.push(this.liabilityInsuranceArray[index].Id);
      if (this.liabilityInsuranceArray[index].fileData != undefined) {
        if (
          this.liabilityInsuranceArray[index].fileData.ContentDocumentId !=
          undefined
        ) {
          this.fileRecordToDelete.push(
            this.liabilityInsuranceArray[index].fileData.ContentDocumentId
          );
        }
      }
    }
    this.liabilityInsuranceArray.splice(index, 1);
  }

  /* removes the file */
  remove(event) {
    const index = event.currentTarget.dataset.index;
    if (this.liabilityInsuranceArray[index].fileData != undefined) {
      if (
        this.liabilityInsuranceArray[index].fileData.ContentDocumentId !=
        undefined
      ) {
        this.fileRecordToDelete.push(
          this.liabilityInsuranceArray[index].fileData.ContentDocumentId
        );
      }
    }
    this.liabilityInsuranceArray[index].fileData = undefined;
  }

  /*Retrieves the object records */
  async retrieveRecord() {
    try {
      this.loaded = false;
      const relatedrecordsresponse =
        await getProvidersRelatedLiabilityInsurance({
          recId: this.recordId,
          fields: RELATED_RECORDS_FIELDS.toString(),
          sObjectName: "verifiable__LiabilityInsurance__c",
          relationshipField: "verifiable__Provider__c"
        });
      console.log("114", relatedrecordsresponse);
      let liablityIds = [];
      if (relatedrecordsresponse.length > 0) {
        let parseRecords = [];
        relatedrecordsresponse.forEach((e, index) => {
          let parseObject = {};
          parseObject.Id = e.Id;
          liablityIds.push(e.Id);
          parseObject.verifiable__CoverageType__c =
            e.verifiable__CoverageType__c;
          parseObject.Name = e.Name;
          parseObject.verifiable__PolicyNumber__c =
            e.verifiable__PolicyNumber__c;
          parseObject.verifiable__IsSelfInsured__c =
            e.verifiable__IsSelfInsured__c != undefined
              ? e.verifiable__IsSelfInsured__c == true
                ? "Yes"
                : "No"
              : undefined;
          parseObject.verifiable__OriginalEffectiveDate__c =
            e.verifiable__OriginalEffectiveDate__c;
          parseObject.verifiable__CurrentEffectiveDate__c =
            e.verifiable__CurrentEffectiveDate__c;
          parseObject.verifiable__CurrentExpirationDate__c =
            e.verifiable__CurrentExpirationDate__c;
          parseObject.verifiable__isUnlimitedCoverage__c =
            e.verifiable__isUnlimitedCoverage__c != undefined
              ? e.verifiable__isUnlimitedCoverage__c == true
                ? "Yes"
                : "No"
              : undefined;
          parseObject.verifiable__PolicyIncludesTailCoverage__c =
            e.verifiable__PolicyIncludesTailCoverage__c != undefined
              ? e.verifiable__PolicyIncludesTailCoverage__c == true
                ? "Yes"
                : "No"
              : undefined;
          parseObject.verifiable__OccurrenceCoverageAmount__c =
            e.verifiable__OccurrenceCoverageAmount__c;
          parseObject.verifiable__AverageCoverageAmount__c =
            e.verifiable__AverageCoverageAmount__c;
          parseRecords.push(parseObject);
        });
        console.log("133", parseRecords);
        const filesData = await getFiles({
          Ids: JSON.stringify(liablityIds).toString()
        });
        filesData.forEach((e) => {
          const index = parseRecords.findIndex((k) => k.Id == e.Id);
          if (index != -1) {
            parseRecords[index].fileData = {};
            parseRecords[index].fileData.Title = e.Title;
            parseRecords[index].fileData.ContentDocumentId =
              e.contentDocumentId;
            parseRecords[index].fileData.ContentDocumentLinkRecordId =
              e.contentDocumentLinkRecordId;
            parseRecords[index].fileData.ContentVersionId = e.contentVersionId;
            parseRecords[index].fileData.VersionData = e.VersionData;
            parseRecords[index].fileData.size = this.bytesToSize(e.size);
          }
        });
        console.log("174", filesData);
        this.liabilityInsuranceArray = [...parseRecords];

        console.log("135", this.liabilityInsuranceArray);
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: {
            retreived: true,
            data: this.recordId,
            stepname: "liabilityinsurance"
          }
        })
      );
      this.loaded = true;
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: {
            retreived: false,
            data: undefined,
            stepname: "liabilityinsurance"
          }
        })
      );
      this.loaded = true;
    }
  }

  /*Saves/Create the record */
  async saveRecord() {
    try {
      this.loaded = false;
      let insuranceArrayCloned = [...this.liabilityInsuranceArray];
      let recordArray = [];
      if (insuranceArrayCloned.length > 0) {
        insuranceArrayCloned.forEach((e) => {
          let dataProcessObject = { ...e };
          console.log("188", dataProcessObject);
          dataProcessObject.verifiable__IsSelfInsured__c =
            e.verifiable__IsSelfInsured__c != undefined
              ? e.verifiable__IsSelfInsured__c == "Yes"
                ? true
                : false
              : undefined;
          dataProcessObject.verifiable__isUnlimitedCoverage__c =
            e.verifiable__isUnlimitedCoverage__c != undefined
              ? e.verifiable__isUnlimitedCoverage__c == "Yes"
                ? true
                : false
              : undefined;
          dataProcessObject.verifiable__PolicyIncludesTailCoverage__c =
            e.verifiable__PolicyIncludesTailCoverage__c != undefined
              ? e.verifiable__PolicyIncludesTailCoverage__c == "Yes"
                ? true
                : false
              : undefined;
          if (dataProcessObject.Id == "") {
            delete dataProcessObject.Id;
          }
          delete dataProcessObject.fileData;
          if (
            !(
              e.Id == "" &&
              e.verifiable__CoverageType__c == "" &&
              e.Name == "" &&
              e.verifiable__PolicyNumber__c == "" &&
              e.verifiable__OriginalEffectiveDate__c == undefined &&
              e.verifiable__CurrentEffectiveDate__c == undefined &&
              e.verifiable__CurrentExpirationDate__c == undefined &&
              e.verifiable__OccurrenceCoverageAmount__c == "" &&
              e.verifiable__AverageCoverageAmount__c == ""
            )
          ) {
            dataProcessObject.verifiable__Provider__c = this.recordId;
            recordArray.push(dataProcessObject);
          }
        });
      }
      console.log("159", recordArray);
      let recordIds = [];
      if (!(recordArray.length == 0 && this.recordsToDelete.length == 0)) {
        recordIds = await insertLiabilityInsuranceRecords({
          sObjectData: JSON.stringify(recordArray).toString(),
          recordsToDelete: JSON.stringify(this.recordsToDelete).toString(),
          sObjectName: "verifiable__LiabilityInsurance__c"
        });
        if (recordIds == null) {
          recordIds = [];
        }
      }
      console.log("211", recordIds);
      if (this.fileRecordToDelete.length > 0) {
        await deleteFiles({
          recordIds: JSON.stringify(this.fileRecordToDelete).toString()
        });
      }
      if (recordIds.length > 0) {
        let fileRecords = [];
        for (let i = 0; i < recordIds.length; i++) {
          if (this.liabilityInsuranceArray[i].fileData != undefined) {
            let fileObject = {};
            fileObject.Id = recordIds[i];
            fileObject.contentVersionId =
              this.liabilityInsuranceArray[i].fileData.ContentVersionId;
            fileObject.contentDocumentLinkRecordId =
              this.liabilityInsuranceArray[
                i
              ].fileData.ContentDocumentLinkRecordId;
            fileObject.Title = this.liabilityInsuranceArray[i].fileData.Title;
            fileObject.VersionData =
              this.liabilityInsuranceArray[i].fileData.VersionData;
            fileRecords.push(fileObject);
          }
        }
        console.log("221", fileRecords);
        if (fileRecords.length > 0) {
          await uploadFiles({ data: JSON.stringify(fileRecords).toString() });
        }
      }
      this.loaded = true;
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: {
            isCompleted: true,
            data: this.recordId,
            stepname: "liabilityinsurance"
          }
        })
      );
    } catch (error) {
      console.log(error);
      if (
        error.body.message.includes("verifiable.LiabilityInsurancesTrigger")
      ) {
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
              stepname: "liabilityinsurance"
            }
          })
        );
      } else {
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: false,
              data: undefined,
              stepname: "liabilityinsurance"
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
          if (message.stepName == "liabilityinsurance") {
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
