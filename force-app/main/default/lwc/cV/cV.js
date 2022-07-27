import { LightningElement, api, wire, track } from 'lwc';
import { subscribe, unsubscribe, APPLICATION_SCOPE, MessageContext } from 'lightning/messageService';
import StepCompletionEvent from '@salesforce/messageChannel/StepCompletionEvent__c';
import uploadFile from '@salesforce/apex/FileUploadController.uploadFile';
import getFile from '@salesforce/apex/FileUploadController.getFile';
import deleteFile from '@salesforce/apex/FileUploadController.deleteFile';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CV extends LightningElement {

    @api recordId; //contact recordId
    @track loaded = true; // spinner visibility dependency
    @track fileData = undefined;
    recordToDelete = undefined; // records to delete
    subscription = null; // subscribe variable

    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscribeToMessageChannel();
        console.log('RecordId: ' + this.recordId);
        if (this.recordId != undefined) {
            this.retrieveRecord();
        }
    }

    /* utility method to format file size*/
    bytesToSize(bytes) {
        let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes == 0) return '0 Byte';
        let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    } 

    /* function to retreive record */
    async retrieveRecord() {
        try {
            this.loaded = false;
            const file = await getFile({ recordId: this.recordId })
            console.log('28',file);
            if (file != null) {
                this.fileData = {};
                this.fileData.Title = file.record.Title;
                this.fileData.size = this.bytesToSize(file.record.ContentSize);
                this.fileData.ContentDocumentId = file.contentDocumentId;
                this.fileData.ContentDocumentLinkRecordId = file.contentDocumentLinkRecordId;
                this.fileData.VersionData = file.versionData;
                this.fileData.Id = file.record.Id;
                // let fileType = file.record.FileType == 'WORD' || file.record.FileType == 'WORD_X' ? 'octet-stream' : file.record.FileType;
                // this.fileData.downloadUrl =  `data:application/${fileType};base64,${file.VersionData}`;
                // console.log('51',this.fileData.downloadUrl);
            }
            this.loaded = true;
            this.dispatchEvent(new CustomEvent('recordretreiveevent', { detail: { retreived: true, data: this.recordId, stepname: 'cv' } }));
           
        }
        catch (error) {
            console.log(error);
            this.dispatchEvent(new CustomEvent('recordretreiveevent', { detail: { retreived: false, data: undefined, stepname: 'cv' } }));
            this.loaded = true;
        }
    }

    /* called when file is upload to handle its responses */
    openfileUpload(event) {
        
        const file = event.target.files[0]
        console.log('26', file);
        let name = file.name;
        console.log('Name', name);
        if (name.includes('.pdf') || name.includes('.doc') || name.includes('.docx')) {
            console.log('If');
            let reader = new FileReader();
            reader.onload = () => {
                console.log('62', reader.result);
                let base64 = reader.result.split(',')[1]
                const fileProcess = {
                    Id: undefined,
                    ContentDocumentId: undefined,
                    ContentDocumentLinkRecordId: undefined,
                    Title: file.name,
                    VersionData: base64,
                    size: this.bytesToSize(file.size),
                    //downloadUrl : reader.result
                }
                console.log(fileProcess);
                if (this.fileData != undefined) {
                    this.recordToDelete = this.fileData.ContentDocumentId != undefined ? this.fileData.ContentDocumentId : undefined;
                }
                this.fileData = { ...fileProcess };
            }
            reader.readAsDataURL(file);
        }
        else {
            console.log('else');
            const event = new ShowToastEvent({
                title: 'Error',
                variant: 'error',
                message: 'File Type not allowed',
            });
            this.dispatchEvent(event);
        }
    }

    /*Saves/Create the record */
    async saveRecord() {
        try {
            this.loaded = false;
            if(this.recordToDelete != undefined){
                await deleteFile({ recordToDelete : this.recordToDelete });
            }
            if (this.fileData != undefined) {
                const title = this.fileData.Title;
                const VerData = this.fileData.VersionData;
                await uploadFile({ base64: VerData, filename: title, recordId: this.recordId , cvId : this.fileData.Id , cdlId : this.fileData.ContentDocumentLinkRecordId});
            }
            this.loaded = true;
            this.dispatchEvent(new CustomEvent('stepcompletionevent', { detail: { isCompleted: true, data: this.recordId, stepname: 'cv' } }));
        }
        catch (error) {
            console.log(error);
            this.dispatchEvent(new CustomEvent('stepcompletionevent', { detail: { isCompleted: false, data: undefined, stepname: 'cv' } }));
            this.loaded = true;
        }
    }

    /* removes the file */
    remove() {
        if (this.fileData.ContentDocumentId != undefined) {
            this.recordToDelete = this.fileData.ContentDocumentId;
        }
        this.fileData = undefined;
    }

    /*LMS subscribe method : called when payload is dispatched */
    subscribeToMessageChannel() {
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                StepCompletionEvent,
                (message) => {
                    console.log(message);
                    if (message.stepName == 'cv') {
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