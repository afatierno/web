function BASE64ENCODE(input) {
  return Utilities.base64Encode(input);
}

function BASE64DECODE(input) {
  return Utilities.newBlob(Utilities.base64Decode(input)).getDataAsString();
}