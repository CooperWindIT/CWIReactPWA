/* =========================================================
   Indian vehicle number – AA 00 AA 0000  (e.g. DL 01 AB 0123)
   - state code : 2 letters
   - RTO code   : 2 digits
   - series     : 1–3 letters
   - number     : 4 digits
   Typing is restricted to this pattern and spaces are added automatically.
   The value SENT to the API has no spaces: DL01AB0123
   ========================================================= */

   export const VEHICLE_PLACEHOLDER = "e.g. DL 01 AB 0123";
   export const VEHICLE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/;
   
   // keeps only the characters that fit the pattern, in order
   export const cleanVehicle = (raw) => {
       const chars = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
       let state = "", rto = "", series = "", num = "";
       for (const c of chars) {
           const isL = c >= "A" && c <= "Z";
           const isD = c >= "0" && c <= "9";
           if (state.length < 2) { if (isL) state += c; continue; }
           if (rto.length < 2) { if (isD) rto += c; continue; }
           if (!num.length && isL && series.length < 3) { series += c; continue; }
           if (series.length && isD && num.length < 4) { num += c; continue; }
           // anything else is ignored
       }
       return { state, rto, series, num, compact: state + rto + series + num };
   };
   
   // "dl01ab0123" -> "DL 01 AB 0123"
   export const formatVehicle = (raw) => {
       const p = cleanVehicle(raw);
       return [p.state, p.rto, p.series, p.num].filter(Boolean).join(" ");
   };
   
   // value for the API: "DL01AB0123"
   export const compactVehicle = (raw) => cleanVehicle(raw).compact;
   
   export const isValidVehicle = (raw) => VEHICLE_REGEX.test(String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, ""));
   
   // short hint for the field while typing
   export const vehicleHint = (raw) => {
       const p = cleanVehicle(raw);
       if (!p.compact) return "";
       if (p.state.length < 2) return "Start with the 2-letter state code (e.g. DL)";
       if (p.rto.length < 2) return "Then the 2-digit RTO code (e.g. 01)";
       if (!p.series.length) return "Then the series letters (e.g. AB)";
       if (p.num.length < 4) return "Then the 4-digit number (e.g. 0123)";
       return "";
   };