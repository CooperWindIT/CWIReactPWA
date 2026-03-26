import React from "react";

const NodeCard = ({ node }) => {

  return (
    <div className="org-card">

      <div className="avatar">
        {node.name.charAt(0)}
      </div>

      <div className="info">
        <h6>{node.name}</h6>
        <span>ID : {node.id}</span>
      </div>

    </div>
  );
};

export default NodeCard;