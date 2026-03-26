import React, { forwardRef } from "react";
import PropTypes from "prop-types";
// import QRCode from 'qrcode';

const PrintPass = forwardRef(({ data, qrCodeUrl }, ref) => {
  // console.log(data, "jsdhggfusdgfsd");

  return (
    <div ref={ref} className="col-6 m-auto container">
      <div className="d-flex justify-content-center">
        <i className="fa-regular fa-id-card fa-lg me-1 mt-3"></i>
        <h2>Visitor Pass</h2>
      </div>
      <div className="">
        <div className="d-flex justify-content-center">
          {/* <h5 className="ms-2 mt-2">Smart Visit</h5> */}
        </div>
        <div className="d-flex justify-content-between">
          <div className="text-start">
            <p className="mb-1 fw-bold">
              Copper Wind Industry <i className="fa-solid fa-building"></i>
            </p>
            <p className="mb-1 fw-bold">
              987xxxxxxx <i className="fa-solid fa-phone"></i>
            </p>
            <p className="mb-1 fw-bold">
              copperwind@gmail.com <i className="fa-solid fa-envelope"></i>
            </p>
          </div>
          <div className="text-end">
            <p className="mb-1 fw-bold">Visitor:</p>
            <p className="mb-1 fw-bold">
              <i className="fa-solid fa-user"></i> {data?.VisitorName}
            </p>
            <p className="mb-1 fw-bold">
              <i className="fa-solid fa-phone"></i> {data?.Mobile}
            </p>
            <p className="mb-1 fw-bold">
              <i className="fa-solid fa-envelope"></i> {data?.Email}
            </p>
          </div>
        </div>

        {/* <h5 className="text-end">{data?.VehicleInfo} <i className="fa-solid fa-car-side"></i></h5> */}
        <table className="table table-bordered">
          <tbody>
            <tr>
              <td className="text-start fw-semibold p-1">Visitor Id:</td>
              <th className="text-end p-1">#{data?.AutoIncNo}</th>
            </tr>
            <tr>
              <td className="text-start fw-semibold p-1">Visitor Date:</td>
              <th className="text-end p-1">
                {data?.MeetingDate
                  ? new Date(data.MeetingDate).toLocaleDateString("en-GB")
                  : "N/A"}
              </th>
            </tr>
            {/* <tr>
              <td className="text-start fw-semibold p-1">Entry Time:</td>
              <th className="text-end p-1">13:04</th>
            </tr>
            <tr>
              <td className="text-start fw-semibold p-1">Exit Time:</td>
              <th className="text-end p-1">15:33</th>
            </tr> */}
            <tr>
              <td className="text-start fw-semibold p-1">Vehicle No</td>
              <th className="text-end p-1">{data?.VehicleInfo}</th>
            </tr>
            <tr>
              <td className="text-start fw-semibold p-1">No Of Members:</td>
              <th className="text-end p-1">{data?.NoOfMembers}</th>
            </tr>
            <tr>
              <td className="text-start fw-semibold p-1">Notes:</td>
              <th className="text-end p-1">{data?.Remarks}</th>
            </tr>
          </tbody>
        </table>

        <div className="d-flex justify-content-center my-4 d-flex m-auto">
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QR Code"
              width="160"
              height="160"
              onError={(e) => console.error("Error loading QR code:", e)}
            />
          ) : (
            <p>Loading QR Code...</p>
          )}
        </div>
      </div>
    </div>
  );
});

PrintPass.displayName = "PrintContent";

PrintPass.propTypes = {
  data: PropTypes.shape({
    VisitorName: PropTypes.string.isRequired,
    Mobile: PropTypes.string.isRequired,
    AutoIncNo: PropTypes.string.isRequired,
    MeetingDate: PropTypes.string.isRequired,
    Email: PropTypes.string.isRequired,
    Remarks: PropTypes.string,
    VehicleInfo: PropTypes.string,
  }).isRequired,
  qrCodeUrl: PropTypes.string,
};

export default PrintPass;
