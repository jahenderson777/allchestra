loadAPI(19);

// Remove this if you want to be able to use deprecated methods without causing script to stop.
// This is useful during development.
host.setShouldFailOnDeprecatedUse(true);

host.defineController("jahenderson777", "My Control Surface3a", "0.4", "ac843af4-f20f-467e-8e4e-cadaca738cd2", "jahenderson777");

function init() {

   // TODO: Perform further initialization here.
   println("My Control Surface initialized!3b");

   const cursorTrack = host.createCursorTrack(0, 0);
   const deviceBank = cursorTrack.createDeviceBank(1);
   const deviceMatcher = host.createBitwigDeviceMatcher("264d6f4e-5067-46c9-a4fa-a75a295d9e01");
   deviceBank.setDeviceMatcher(deviceMatcher);
   const device = deviceBank.getItemAt(0);
   println("a");
   console.log(device);
   println("b");
}


function flush() {
   // TODO: Flush any output to your controller here.
}

function exit() {

}