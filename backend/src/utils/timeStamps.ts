
// Function to get the universal date and time
function getUniversalDateTime(): string {
    const date = new Date();
    const universalDateTime: string = date.toISOString();
    return universalDateTime;
  }
  
  // Function to convert the universal date and time to the current time zone
  function convertToCurrentTimeZone(universalDateTime: string): string {
    const date = new Date(universalDateTime);
    const localDateTime: string = date.toLocaleString();
    return localDateTime;
  }
  
  // Function to separate date and time from a datetime string
  function separateDateAndTime(dateTimeString: string): { date: string, time: string } {
    const date: string = dateTimeString.split('T')[0];
    const time: string = dateTimeString.split('T')[1].split('.')[0];
    return { date, time };
  }
  
  const universalDateTime: string = getUniversalDateTime();
  // console.log("Universal Date and Time:", universalDateTime);
  
  const { date, time } = separateDateAndTime(universalDateTime);
  // console.log("Date:", date);
  // console.log("Time:", time);
  
  const localDateTime: string = convertToCurrentTimeZone(universalDateTime);
  // console.log("Local Date and Time:", localDateTime);
  
  // Function to separate date and time from a local datetime string
function separateLocalDateAndTime(localDateTime: string): { date: string, time: string } {
    const date: string = localDateTime.split(',')[0];
    const time: string = localDateTime.split(',')[1].trim();
    return { date, time };
  }
  
  // Example usage
  // const { date: localDate, time: localTime } = separateLocalDateAndTime(localDateTime);
  // console.log("Local Date:", localDate);
  // console.log("Local Time:", localTime);
   // Function to get current timestamp in IST with separated date and time


  export { getUniversalDateTime, convertToCurrentTimeZone, separateDateAndTime, separateLocalDateAndTime };