import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const EmployeeContactQR = () => {
  // =========================================================
  // SAMPLE EMPLOYEE DATA
  // Replace this with your API data later
  // =========================================================

  const employees = [
    {
      id: 1,
      firstName: "Kumaresan",
      lastName: "K",
      designation: "Vice President - Operations",
      department: "Operations",
      phone: "+91 9876543210",
      email: "kumaresan@cooperwind.in",
      website: "https://cooperwind.in",
      address: "Hyderabad, Telangana, India",
    },

    {
      id: 2,
      firstName: "Chaitanya",
      lastName: "Nalam",
      designation: "Senior React Developer",
      department: "Technology",
      phone: "+91 9876543211",
      email: "chaitanya@cooperwind.in",
      website: "https://cooperwind.in",
      address: "Hyderabad, Telangana, India",
    },

    {
      id: 3,
      firstName: "Gireesh",
      lastName: "Parimi",
      designation: "Software Developer",
      department: "Technology",
      phone: "+91 9876543212",
      email: "gireesh@cooperwind.in",
      website: "https://cooperwind.in",
      address: "Hyderabad, Telangana, India",
    },
  ];

  // =========================================================
  // STATE
  // =========================================================

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    employees[0].id
  );

  const cardRef = useRef(null);
  const qrRef = useRef(null);

  const employee = employees.find(
    (item) => item.id === Number(selectedEmployeeId)
  );

  // =========================================================
  // ESCAPE VCARD VALUES
  // =========================================================

  const escapeVCardValue = (value = "") => {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  };

  // =========================================================
  // GENERATE VCARD
  // =========================================================

  const generateVCard = (employee) => {
    const fullName = `${employee.firstName} ${employee.lastName}`;

    return [
      "BEGIN:VCARD",
      "VERSION:3.0",

      `N:${escapeVCardValue(employee.lastName)};${escapeVCardValue(
        employee.firstName
      )};;;`,

      `FN:${escapeVCardValue(fullName)}`,

      `ORG:${escapeVCardValue("Cooperwind India Private Limited")}`,

      `TITLE:${escapeVCardValue(employee.designation)}`,

      `TEL;TYPE=CELL,VOICE:${escapeVCardValue(employee.phone)}`,

      `EMAIL;TYPE=WORK:${escapeVCardValue(employee.email)}`,

      `URL:${escapeVCardValue(employee.website)}`,

      `ADR;TYPE=WORK:;;${escapeVCardValue(
        employee.address
      )};;;;`,

      "END:VCARD",
    ].join("\r\n");
  };

  // =========================================================
  // VCARD DATA
  // =========================================================

  const vCard = generateVCard(employee);

  // =========================================================
  // DOWNLOAD QR CODE AS PNG
  // =========================================================

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector("svg");

    if (!svg) {
      alert("QR Code not found.");
      return;
    }

    const serializer = new XMLSerializer();

    const svgString = serializer.serializeToString(svg);

    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(svgBlob);

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");

      const scale = 3;

      canvas.width = 500 * scale;
      canvas.height = 500 * scale;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";

      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );

      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");

      const link = document.createElement("a");

      link.href = pngUrl;

      link.download = `${employee.firstName}_${employee.lastName}_Contact_QR.png`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    };

    img.src = url;
  };

  // =========================================================
  // PRINT
  // =========================================================

  const printCard = () => {
    window.print();
  };

  // =========================================================
  // COPY VCARD
  // =========================================================

  const copyVCard = async () => {
    try {
      await navigator.clipboard.writeText(vCard);

      alert("vCard data copied successfully.");
    } catch (error) {
      console.error(error);

      alert("Unable to copy vCard data.");
    }
  };

  return (
    <>
      {/* =====================================================
          MAIN PAGE
      ====================================================== */}

      <div className="employee-qr-page">

        {/* ===================================================
            ADMIN CONTROLS
        ==================================================== */}

        <div className="controls-card no-print">

          <div className="controls-header">
            <div>
              <h4>Employee Contact QR</h4>

              <p>
                Generate a digital contact card for employees
              </p>
            </div>
          </div>

          <div className="control-row">

            <div className="control-field">

              <label>
                Select Employee
              </label>

              <select
                value={selectedEmployeeId}
                onChange={(e) =>
                  setSelectedEmployeeId(e.target.value)
                }
              >
                {employees.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.firstName} {item.lastName} -{" "}
                    {item.designation}
                  </option>
                ))}
              </select>

            </div>

            <div className="control-actions">

              <button
                type="button"
                className="btn-primary"
                onClick={downloadQRCode}
              >
                ↓ Download QR
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={printCard}
              >
                🖨 Print Card
              </button>

            </div>

          </div>
        </div>


        {/* ===================================================
            CONTACT CARD
        ==================================================== */}

        <div
          className="contact-card"
          ref={cardRef}
        >

          {/* TOP COLOR STRIP */}

          <div className="top-strip">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>


          {/* COMPANY HEADER */}

          <div className="company-section">

            <div className="company-logo">
              CW
            </div>

            <div>

              <div className="company-name">
                COOPERWIND
              </div>

              <div className="company-full-name">
                Cooperwind India Private Limited
              </div>

            </div>

          </div>


          {/* QR SECTION */}

          <div
            className="qr-wrapper"
            ref={qrRef}
          >

            <QRCodeSVG
              value={vCard}
              size={450}
              level="H"
              bgColor="#ffffff"
              fgColor="#174F8C"
              includeMargin={true}
            />

          </div>


          {/* SCAN MESSAGE */}

          <div className="scan-title">
            SCAN TO SAVE CONTACT
          </div>


          {/* EMPLOYEE NAME */}

          <div className="employee-name">

            {employee.firstName} {employee.lastName}

          </div>


          {/* DESIGNATION */}

          <div className="employee-designation">

            {employee.designation}

          </div>


          {/* DEPARTMENT */}

          {employee.department && (
            <div className="employee-department">

              {employee.department}

            </div>
          )}


          {/* CONTACT DETAILS */}

          <div className="contact-details">

            <div className="contact-item">

              <span className="contact-icon">
                ☎
              </span>

              <span>
                {employee.phone}
              </span>

            </div>


            <div className="contact-item">

              <span className="contact-icon">
                ✉
              </span>

              <span>
                {employee.email}
              </span>

            </div>

          </div>


          {/* FOOTER */}

          <div className="card-footer">

            Scan this QR code to save the employee's
            contact details directly to your phone.

          </div>

        </div>


        {/* ===================================================
            TECHNICAL INFORMATION
        ==================================================== */}

        <div className="technical-info no-print">

          <div className="info-title">
            QR Contact Information
          </div>

          <div className="info-grid">

            <div>
              <strong>Name</strong>
              <span>
                {employee.firstName} {employee.lastName}
              </span>
            </div>

            <div>
              <strong>Designation</strong>
              <span>
                {employee.designation}
              </span>
            </div>

            <div>
              <strong>Phone</strong>
              <span>
                {employee.phone}
              </span>
            </div>

            <div>
              <strong>Email</strong>
              <span>
                {employee.email}
              </span>
            </div>

          </div>


          <button
            type="button"
            className="copy-button"
            onClick={copyVCard}
          >
            Copy vCard Data
          </button>

        </div>

      </div>


      {/* =====================================================
          CSS
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f7fb;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
        }


        /* ===============================================
           PAGE
        ================================================ */

        .employee-qr-page {
          min-height: 100vh;
          padding: 35px 20px 60px;
          background:
            linear-gradient(
              180deg,
              #f5f8fc 0%,
              #eef3f9 100%
            );
        }


        /* ===============================================
           CONTROLS
        ================================================ */

        .controls-card {
          max-width: 850px;
          margin: 0 auto 30px;
          background: #ffffff;
          border: 1px solid #e4eaf1;
          border-radius: 16px;
          padding: 22px;
          box-shadow:
            0 8px 30px rgba(22, 50, 80, 0.08);
        }


        .controls-header {
          margin-bottom: 20px;
        }


        .controls-header h4 {
          margin: 0 0 5px;
          font-size: 20px;
          font-weight: 700;
          color: #173f69;
        }


        .controls-header p {
          margin: 0;
          color: #7a8795;
          font-size: 14px;
        }


        .control-row {
          display: flex;
          align-items: end;
          gap: 15px;
        }


        .control-field {
          flex: 1;
        }


        .control-field label {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 600;
          color: #394b5f;
        }


        .control-field select {
          width: 100%;
          height: 44px;
          padding: 0 13px;
          border: 1px solid #d6dee8;
          border-radius: 8px;
          background: #ffffff;
          color: #34495e;
          outline: none;
          font-size: 14px;
        }


        .control-field select:focus {
          border-color: #174f8c;
          box-shadow:
            0 0 0 3px rgba(23, 79, 140, 0.10);
        }


        .control-actions {
          display: flex;
          gap: 10px;
        }


        .control-actions button {
          height: 44px;
          border: none;
          border-radius: 8px;
          padding: 0 18px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }


        .btn-primary {
          background: #174f8c;
          color: #ffffff;
        }


        .btn-primary:hover {
          background: #123f70;
        }


        .btn-secondary {
          background: #edf2f7;
          color: #24435f;
        }


        .btn-secondary:hover {
          background: #e0e7ef;
        }


        /* ===============================================
           CONTACT CARD
        ================================================ */

        .contact-card {
          width: 760px;
          max-width: 100%;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          text-align: center;
          border: 1px solid #dce4ed;
          box-shadow:
            0 18px 55px rgba(28, 54, 80, 0.13);
        }


        /* ===============================================
           COLOR STRIP
        ================================================ */

        .top-strip {
          height: 7px;
          display: flex;
        }


        .top-strip span {
          flex: 1;
        }


        .top-strip span:nth-child(1) {
          background: #174f8c;
        }

        .top-strip span:nth-child(2) {
          background: #1597b5;
        }

        .top-strip span:nth-child(3) {
          background: #18a06f;
        }

        .top-strip span:nth-child(4) {
          background: #f3b63f;
        }

        .top-strip span:nth-child(5) {
          background: #ec8750;
        }

        .top-strip span:nth-child(6) {
          background: #815ba7;
        }


        /* ===============================================
           COMPANY
        ================================================ */

        .company-section {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          padding: 30px 25px 18px;
        }


        .company-logo {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #174f8c;
          color: #ffffff;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 1px;
        }


        .company-name {
          text-align: left;
          font-size: 30px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #174f8c;
        }


        .company-full-name {
          text-align: left;
          margin-top: 6px;
          font-size: 16px;
          color: #343c46;
        }


        /* ===============================================
           QR
        ================================================ */

        .qr-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px 35px 10px;
        }


        .qr-wrapper svg {
          width: 450px;
          height: 450px;
          max-width: 100%;
          height: auto;
          display: block;
          image-rendering: pixelated;
        }


        /* ===============================================
           SCAN TITLE
        ================================================ */

        .scan-title {
          margin-top: 8px;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #174f8c;
        }


        /* ===============================================
           EMPLOYEE
        ================================================ */

        .employee-name {
          margin-top: 8px;
          font-size: 21px;
          font-weight: 700;
          color: #27384a;
        }


        .employee-designation {
          margin-top: 4px;
          font-size: 16px;
          color: #475766;
        }


        .employee-department {
          margin-top: 3px;
          font-size: 14px;
          font-weight: 600;
          color: #174f8c;
        }


        /* ===============================================
           CONTACT DETAILS
        ================================================ */

        .contact-details {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 20px;
          margin: 18px auto 0;
          padding: 0 25px;
        }


        .contact-item {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #435465;
          font-size: 13px;
        }


        .contact-icon {
          color: #174f8c;
          font-weight: 700;
        }


        /* ===============================================
           FOOTER
        ================================================ */

        .card-footer {
          margin-top: 22px;
          padding: 15px 20px;
          background: #f7f9fc;
          border-top: 1px solid #e6ebf1;
          color: #7a8795;
          font-size: 12px;
        }


        /* ===============================================
           TECHNICAL INFO
        ================================================ */

        .technical-info {
          max-width: 850px;
          margin: 25px auto 0;
          padding: 20px;
          background: #ffffff;
          border: 1px solid #e3e9f0;
          border-radius: 14px;
        }


        .info-title {
          font-size: 15px;
          font-weight: 700;
          color: #243e57;
          margin-bottom: 15px;
        }


        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }


        .info-grid > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 11px 13px;
          border-radius: 8px;
          background: #f7f9fc;
        }


        .info-grid strong {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: #8190a0;
        }


        .info-grid span {
          font-size: 13px;
          color: #34495e;
          word-break: break-word;
        }


        .copy-button {
          margin-top: 15px;
          height: 40px;
          padding: 0 16px;
          border: 1px solid #d8e1eb;
          background: #ffffff;
          border-radius: 7px;
          color: #174f8c;
          cursor: pointer;
          font-weight: 600;
        }


        /* ===============================================
           RESPONSIVE
        ================================================ */

        @media (max-width: 700px) {

          .employee-qr-page {
            padding: 15px 10px 40px;
          }


          .control-row {
            flex-direction: column;
            align-items: stretch;
          }


          .control-actions {
            width: 100%;
          }


          .control-actions button {
            flex: 1;
          }


          .company-section {
            padding-top: 25px;
          }


          .company-name {
            font-size: 23px;
          }


          .company-full-name {
            font-size: 13px;
          }


          .company-logo {
            width: 42px;
            height: 42px;
          }


          .qr-wrapper {
            padding-left: 15px;
            padding-right: 15px;
          }


          .scan-title {
            font-size: 23px;
          }


          .contact-details {
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }


          .info-grid {
            grid-template-columns: 1fr;
          }

        }


        /* ===============================================
           PRINT
        ================================================ */

        @media print {

          body {
            background: #ffffff;
          }


          .no-print {
            display: none !important;
          }


          .employee-qr-page {
            padding: 0;
            background: #ffffff;
          }


          .contact-card {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
            box-shadow: none;
            border: none;
          }

        }

      `}</style>
    </>
  );
};

export default EmployeeContactQR;