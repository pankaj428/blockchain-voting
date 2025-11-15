// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Voting {

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    uint256 public candidatesCount;
    mapping(uint256 => Candidate) public candidates;

    mapping(address => bool) public hasVoted;

    address public admin; // ⭐ Admin address

    constructor(string[] memory _candidateNames) {
        admin = msg.sender;  // ⭐ Deployer becomes Admin

        for (uint i = 0; i < _candidateNames.length; i++) {
            candidatesCount++;
            candidates[candidatesCount] = Candidate(
                candidatesCount,
                _candidateNames[i],
                0
            );
        }
    }

    // ⭐ ONLY ADMIN CAN ADD CANDIDATES
    function addCandidate(string memory _name) public {
        require(msg.sender == admin, "Only admin can add candidates");
        require(bytes(_name).length > 0, "Empty name");

        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    // Anyone can vote
    function vote(uint256 _candidateId) public {
        require(!hasVoted[msg.sender], "You already voted");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");

        candidates[_candidateId].voteCount++;
        hasVoted[msg.sender] = true;
    }
}
