import { LightningElement, track, api, wire } from 'lwc';
import VERIFIABLE_LOGO from '@salesforce/resourceUrl/poweredByVerifiableLogoPublic';
import { publish, MessageContext } from 'lightning/messageService';
import StepCompletionEvent from '@salesforce/messageChannel/StepCompletionEvent__c';

export default class providerApplicationForm extends LightningElement {

    //handles child components visibility
    // @track componentVisiblity = { 'getStarted': true, 'CAQH': false, 'demoGraphics': false, 'address': false, 'license': false, 'dea': false , 'specialties' : false ,  'education' : false , 'training' : false  ,'workHistory' : false , 'cv' : false , 'liabilityinsurance' : false , 'disclosurequestion' : false};
    @track componentVisiblity = { 'getStarted': true, 'CAQH': false, 'basic': false, 'license': false, 'dea': false , 'specialties' : false ,  'education' : false , 'training' : false  ,'workHistory' : false , 'cv' : false , 'liabilityinsurance' : false , 'disclosurequestion' : false};

    //Progress Value of the progress bar on the screen
    @track progressBarValue = 7.7;
    
    //Assign Step Number to the chiild components
    // @track pageWiseSteps = { 1 : 'getStarted' , 2 : 'CAQH' , 3 : 'demoGraphics' , 4 : 'address' ,5 : 'license' ,6 : 'dea' , 7 : 'specialties' , 8 : 'education' , 9 : 'training' , 10 : 'workHistory' , 11 : 'cv' , 12 : 'liabilityinsurance' , 13 : 'disclosurequestion'};
    @track pageWiseSteps = { 1 : 'getStarted' , 2 : 'CAQH' , 3 : 'basic' , 4 : 'license' ,5 : 'dea' , 6 : 'specialties' , 7 : 'education' , 8 : 'training' , 9 : 'workHistory' , 10 : 'cv' , 11 : 'liabilityinsurance' , 12 : 'disclosurequestion'};


    @track completeSetUp = false;

    //Id of the contact(Provider)record
    contactId;

    //Page Number of the screen
    pageNumber = 1;

    //handles Footer Buttons visibility
    @track showFooterButtons = true;

   

    @wire(MessageContext)
    messageContext;

    get backButtonVisible() {
        return this.pageNumber !== 1;
    }
    get continueButtonVisible() {
        return this.pageNumber !== 13;
    }
    get verifiableLogo() {
        return VERIFIABLE_LOGO;
    }

    /* called when continue button is clicked */ 
    handleSaveEvent() {
        this.showFooterButtons = false;
        const step = this.pageWiseSteps[this.pageNumber];
        const payload = {stepName : step};
        publish(this.messageContext,StepCompletionEvent,payload);
    }

    /*called when a event is dispatched from child component.event from child component generally dispatch when record processing is finished*/
    handleRecordSave(event) {
        const response = event.detail;
        console.log('52', JSON.parse(JSON.stringify(response)));
        console.log('boolean', response.isCompleted);

       

        if(response.isCompleted){
            this.contactId = response.data != undefined ? response.data : undefined;
            if(response.stepname == 'disclosurequestion'){
                this.showFooterButtons = false;
                this.completeSetUp = true;
                let prev = this.pageWiseSteps[this.pageNumber];
                this.componentVisiblity[prev] = false;
            }
            else{
                this.showFooterButtons = true;
                this.handleComponentVisiblity('nextPage');
            }
        }
        else{
            this.showFooterButtons = true;
        }
    }

    /* called when back button is clicked */
    handleBackEvent() {
        this.handleComponentVisiblity('prevPage');
        this.showFooterButtons = false;
    }

    /* called when record is retreived in its seperate component to remove spinner screen */
    handleRecordRetreival(event){
        let response = event.detail;
        console.log(JSON.parse(JSON.stringify(response)));
        if(response.retreived){
            this.contactId = response.data;
            console.log(response.stepname);
        }
        this.showFooterButtons = true;
    }

    /*generic method to maintain page numbers and component visiblity.called when continue or back button is clicked*/
    handleComponentVisiblity(action) {
        if (action == 'nextPage') {
            let prev = this.pageWiseSteps[this.pageNumber];
            this.componentVisiblity[prev] = false;
            this.pageNumber++;
            this.progressBarValue += 7.7;
            let next = this.pageWiseSteps[this.pageNumber];
            this.componentVisiblity[next] = true;
            console.log('compo',this.componentVisiblity);
        }
        else if (action == 'prevPage') {
            let next = this.pageWiseSteps[this.pageNumber];
            this.componentVisiblity[next] = false;
            this.pageNumber--;
            this.progressBarValue = this.progressBarValue - 7.7;
            let prev = this.pageWiseSteps[this.pageNumber];
            this.componentVisiblity[prev] = true;
            console.log('compo',this.componentVisiblity);
        }
    }
}