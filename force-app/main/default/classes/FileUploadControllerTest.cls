/**
 * @description       : Class to test the FileUplpoadController classs
 * @author            : Concretio
 * @group             :
 * @created on        : 12th July 2022
 * @last modified on  : 07-25-2022
 * @last modified by  : Anuja Dadheech
 **/
@isTest
public with sharing class FileUploadControllerTest {
  //Creating a contact berfore every method run
  @TestSetup
  static void setupTestData() {
    Contact con = new Contact(LastName = 'Test Contact');
    insert con;
  }

  // File Insert Test
  @isTest
  static void insertFileTest() {
    Contact con = [SELECT Id FROM Contact LIMIT 1];
    Blob file = Blob.valueOf('Test Attachment Body');
    Test.startTest();
    FileUploadController.uploadFile(
      EncodingUtil.base64Encode(file),
      'TestFile',
      con.id,
      null,
      null
    );
    FileUploadController.FileWrapper fileObj = FileUploadController.getFile(
      con.Id
    );
    Test.stopTest();
    System.assertEquals(
      'TestFile',
      fileObj.record.get('Title'),
      'File Not Inserted'
    );
  }

  // Exception test while inserting a file by giving empty ids
  @isTest
  static void insertFileExceptionTest() {
    try {
      Contact con = [SELECT Id FROM Contact LIMIT 1];
      Blob file = Blob.valueOf('Test Attachment Body');
      Test.startTest();
      FileUploadController.uploadFile(
        EncodingUtil.base64Encode(file),
        'TestFile',
        con.id,
        '',
        ''
      );
      Test.stopTest();
    } catch (Exception e) {
      System.assertEquals(
        'Script-thrown exception',
        e.getMessage(),
        'Exception Not Thrown'
      );
    }
  }

  // Test get method when no file is inserted for the particular record
  @isTest
  static void incaseNoFileIsInserted() {
    Contact con = [SELECT Id FROM Contact LIMIT 1];
    Test.startTest();
    FileUploadController.FileWrapper fileObj = FileUploadController.getFile(
      con.Id
    );
    Test.stopTest();
    System.assertEquals(null, fileObj, 'Diffrent File Fetched');
  }

  // Test File upload
  @isTest
  static void uploadFileTest() {
    Contact con = [SELECT Id FROM Contact LIMIT 1];
    Blob file = Blob.valueOf('Test Attachment Body');
    ContentVersion contentFile = new ContentVersion(
      VersionData = file,
      Title = 'TestFile',
      PathOnClient = 'TestFile',
      isMajorVersion = false
    );
    insert contentFile;
    SObject contentFileRetreived = Database.query(
        'SELECT Id,ContentDocumentId FROM ContentVersion WHERE Id = \'' +
        contentFile.id +
        '\' LIMIT 1'
      )
      .get(0);
    ContentDocumentLink contentLinkRecord = new ContentDocumentLink(
      ContentDocumentId = (Id) contentFileRetreived.get('ContentDocumentId'),
      LinkedEntityId = con.Id,
      ShareType = 'V',
      visibility = 'AllUsers'
    );
    insert contentLinkRecord;
    file = Blob.valueOf('Updated Attachment Body');
    Test.startTest();
    FileUploadController.uploadFile(
      EncodingUtil.base64Encode(file),
      'UpdatedFile',
      con.Id,
      contentFile.Id,
      contentLinkRecord.Id
    );
    FileUploadController.FileWrapper fileObj = FileUploadController.getFile(
      con.Id
    );
    Test.stopTest();
    System.assertEquals(
      'UpdatedFile',
      fileObj.record.get('Title'),
      'File Not Updated'
    );
  }

  // Test file delete
  @isTest
  static void deleteFileTest() {
    Contact con = [SELECT Id FROM Contact LIMIT 1];
    Blob file = Blob.valueOf('Test Attachment Body');
    ContentVersion contentFile = new ContentVersion(
      VersionData = file,
      Title = 'TestFile',
      PathOnClient = 'TestFile',
      isMajorVersion = false
    );
    insert contentFile;
    SObject contentFileRetreived = Database.query(
        'SELECT Id,ContentDocumentId FROM ContentVersion WHERE Id = \'' +
        contentFile.id +
        '\' LIMIT 1'
      )
      .get(0);
    ContentDocumentLink contentLinkRecord = new ContentDocumentLink(
      ContentDocumentId = (Id) contentFileRetreived.get('ContentDocumentId'),
      LinkedEntityId = con.Id,
      ShareType = 'V',
      visibility = 'AllUsers'
    );
    insert contentLinkRecord;
    Test.startTest();
    FileUploadController.deleteFile(
      String.valueOf(contentFileRetreived.get('ContentDocumentId'))
    );
    FileUploadController.FileWrapper fileObj = FileUploadController.getFile(
      con.Id
    );
    Test.stopTest();
    System.assertEquals(null, fileObj, 'File Not Deleted');
  }

  //Exception test while deleting a file by giving empty id
  @isTest
  static void deleteFileExceptionTest() {
    try {
      Test.startTest();
      FileUploadController.deleteFile('');
      Test.stopTest();
    } catch (Exception e) {
      System.assertEquals(
        'Script-thrown exception',
        e.getMessage(),
        'Exception Not Thrown'
      );
    }
  }
}