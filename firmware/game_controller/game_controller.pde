#include <Max3421e.h>
#include <Usb.h>
#include <AndroidAccessory.h>

AndroidAccessory acc("Google, Inc.",
		     "GameController",
		     "Arduino Game Controller",
		     "1.0",
		     "http://www.android.com",
		     "0000000012345678");
boolean isConnected = false;

void setup() {
  Serial.begin(115200);
  Serial.print("\r\nStart");
  acc.powerOn();
}

void loop() {
  // Normalizing the analog inputs
  int joys[2];
  joys[0] = -1 * (analogRead(A1) - 524) / 125;
  joys[1] = ((analogRead(A0) - 524) / 125);
        
  if (!isConnected) {
    isConnected = acc.isConnected();
  } else {
    acc.write(joys, sizeof(joys)); 
  }
}
