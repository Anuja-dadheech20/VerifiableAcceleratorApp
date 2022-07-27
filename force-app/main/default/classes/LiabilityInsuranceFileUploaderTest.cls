/**
* @description       : Class to test the LiabilityInsuranceFileUploader classs
* @author            : Concretio 
* @group             : 
* @created on        : 12th July 2022
* @last modified on  : 07-15-2022
* @last modified by  : Anuja Dadheech
**/

@isTest
public with sharing class LiabilityInsuranceFileUploaderTest {
    
    
    /*@TestSetup 
    static void setupTestData(){
        Contact con = new Contact(LastName='Test Contact');
        insert con;
        List<verifiable__LiabilityInsurance__c> liabilityInsurances = new List<verifiable__LiabilityInsurance__c>{new verifiable__LiabilityInsurance__c(Name = 'Insurance1', verifiable__Provider__c = con.Id),new verifiable__LiabilityInsurance__c(Name = 'Insurance2',verifiable__Provider__c = con.Id)};
        insert liabilityInsurances;
    }*/
   
	@isTest(SeeAllData=true)
    static void deleteFilesTest() {
        
        Test.setMock(HttpCalloutMock.class, new VerifiableAPIMock('License'));
        
        Contact con = new Contact(LastName='Test Contact');
        insert con;
        
        List<verifiable__LiabilityInsurance__c> liabilityInsurances = new List<verifiable__LiabilityInsurance__c>{new verifiable__LiabilityInsurance__c(Name = 'Insurance1', verifiable__Provider__c = con.Id),new verifiable__LiabilityInsurance__c(Name = 'Insurance2',verifiable__Provider__c = con.Id)};
        insert liabilityInsurances;
        
        Blob file = Blob.valueOf('Test Attachment Body');
        List<ContentVersion> files = new List<ContentVersion>{new ContentVersion(VersionData = file, Title = 'InsuranceFile1' , PathOnClient = 'InsuranceFile1', isMajorVersion = false), new ContentVersion(VersionData = file, Title = 'InsuranceFile2' , PathOnClient = 'InsuranceFile2', isMajorVersion = false)};
        insert files;
        
        List<ContentVersion> contentFilesRetreived = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id IN : files];
        List<ContentDocumentLink> contentLinkRecords = new List<ContentDocumentLink>{new ContentDocumentLink(ContentDocumentId = contentFilesRetreived[0].ContentDocumentId , LinkedEntityId = liabilityInsurances[0].Id , ShareType = 'V',visibility = 'AllUsers'), new ContentDocumentLink(ContentDocumentId = contentFilesRetreived[0].ContentDocumentId , LinkedEntityId = liabilityInsurances[1].Id , ShareType = 'V',visibility = 'AllUsers')};
        insert contentLinkRecords;
        
        Test.startTest();
        
        LiabilityInsuranceFileUploader.deleteFiles(JSON.serialize(new List<String>{contentFilesRetreived[0].ContentDocumentId, contentFilesRetreived[1].ContentDocumentId}));
        List<LiabilityInsuranceFileUploader.LiabilityFileWrapper> fetchedLiabilityInsuranceFiles = LiabilityInsuranceFileUploader.getFiles(JSON.serialize(new List<String>{liabilityInsurances[0].Id, liabilityInsurances[1].Id}));
        
        Test.stopTest();
        
        System.assertEquals(0 , fetchedLiabilityInsuranceFiles.size(), 'File Not Deleted');
    }
    
    /*@isTest(SeeAllData=true)
    static void deleteFilesExceptionTest() {
        
        Contact con = new Contact(LastName='Test Contact');
        insert con;
        List<verifiable__LiabilityInsurance__c> liabilityInsurances = new List<verifiable__LiabilityInsurance__c>{new verifiable__LiabilityInsurance__c(Name = 'Insurance1', verifiable__Provider__c = con.Id),new verifiable__LiabilityInsurance__c(Name = 'Insurance2',verifiable__Provider__c = con.Id)};
        insert liabilityInsurances;
        
        try {
            Test.startTest();
            LiabilityInsuranceFileUploader.deleteFiles(JSON.serialize(new List<String>{'',''}));
            Test.stopTest();
        }
        catch(Exception e) {
            System.assertEquals('Script-thrown exception', e.getMessage(), 'Exception Not Thrown');
        }
    }*/
}