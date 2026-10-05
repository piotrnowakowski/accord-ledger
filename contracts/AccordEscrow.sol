// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @notice TESTNET PROTOTYPE. Native-asset escrow; not a legal title registry.
/// @dev One immutable agreement per deployment. CRE workflow is read-only in v0.1.
contract AccordEscrow {
    enum State { AwaitingApprovals, Approved, Funded, Disputed, Released, Refunded }
    State public state;
    bytes32 public immutable termsHash;
    bytes32 public immutable assetHash;
    address public immutable buyer;
    address public immutable seller;
    address public immutable inspector;
    address public immutable arbitrator;
    uint256 public immutable amount;
    uint256 public immutable deadline;
    uint256 public immutable maxEvidenceAge;
    bool public buyerApproved;
    bool public sellerApproved;
    uint256 private escrowed;
    mapping(address => uint256) public withdrawable;

    event Approved(address indexed party, bytes32 indexed terms);
    event Funded(uint256 amount);
    event Disputed(address indexed party);
    event Settled(State state, address indexed beneficiary, bytes32 evidenceHash);

    constructor(bytes32 terms_, bytes32 asset_, address buyer_, address seller_, address inspector_,
                address arbitrator_, uint256 amount_, uint256 deadline_, uint256 maxAge_) {
        require(terms_ != bytes32(0) && asset_ != bytes32(0), "missing commitment");
        require(buyer_ != address(0) && seller_ != address(0) && inspector_ != address(0)
            && arbitrator_ != address(0), "zero role");
        require(buyer_ != seller_ && buyer_ != inspector_ && buyer_ != arbitrator_
            && seller_ != inspector_ && seller_ != arbitrator_ && inspector_ != arbitrator_, "roles overlap");
        require(amount_ > 0 && deadline_ > block.timestamp && maxAge_ > 0 && maxAge_ <= 1 days, "bad policy");
        termsHash = terms_; assetHash = asset_; buyer = buyer_; seller = seller_;
        inspector = inspector_; arbitrator = arbitrator_; amount = amount_;
        deadline = deadline_; maxEvidenceAge = maxAge_;
    }

    function approve(bytes32 reviewedTerms) external {
        require(state == State.AwaitingApprovals && block.timestamp < deadline, "not awaiting approval");
        require(reviewedTerms == termsHash, "wrong terms");
        if (msg.sender == buyer) buyerApproved = true;
        else if (msg.sender == seller) sellerApproved = true;
        else revert("not a party");
        emit Approved(msg.sender, reviewedTerms);
        if (buyerApproved && sellerApproved) state = State.Approved;
    }

    function fund() external payable {
        require(msg.sender == buyer && state == State.Approved, "not approved buyer");
        require(block.timestamp < deadline && msg.value == amount, "wrong funding");
        escrowed = msg.value;
        state = State.Funded;
        emit Funded(msg.value);
    }

    function inspectionPolicy() external view returns (bytes32, bytes32, uint8, uint256, uint256) {
        return (termsHash, assetHash, uint8(state), deadline, maxEvidenceAge);
    }

    /// @notice Trusted inspector attestation, NOT a CRE report receiver.
    /// @dev Evidence authenticity relies on this transaction's inspector signer.
    function attestAcceptance(bytes32 terms, bytes32 asset, bytes32 evidenceHash,
                              uint256 observedAt, uint256 expiresAt) external {
        require(msg.sender == inspector, "not inspector");
        require(state == State.Funded && block.timestamp < deadline, "not releasable");
        require(terms == termsHash && asset == assetHash && evidenceHash != bytes32(0), "wrong evidence");
        require(observedAt <= block.timestamp && block.timestamp - observedAt <= maxEvidenceAge
            && expiresAt > block.timestamp, "stale evidence");
        settle(State.Released, seller, evidenceHash);
    }

    function dispute() external {
        require(msg.sender == buyer || msg.sender == seller, "not a party");
        require(state == State.Funded, "not funded");
        state = State.Disputed;
        emit Disputed(msg.sender);
    }

    function resolve(bool releaseToSeller, bytes32 decisionHash) external {
        require(msg.sender == arbitrator && state == State.Disputed, "not arbitration");
        require(decisionHash != bytes32(0), "missing decision");
        settle(releaseToSeller ? State.Released : State.Refunded,
               releaseToSeller ? seller : buyer, decisionHash);
    }

    function refundExpired() external {
        require(msg.sender == buyer && state == State.Funded && block.timestamp >= deadline, "not refundable");
        settle(State.Refunded, buyer, bytes32(0));
    }

    function settle(State next, address beneficiary, bytes32 evidence) private {
        state = next;
        withdrawable[beneficiary] += escrowed;
        escrowed = 0;
        emit Settled(next, beneficiary, evidence);
    }

    function withdraw() external {
        uint256 value = withdrawable[msg.sender];
        require(value > 0, "nothing to withdraw");
        withdrawable[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: value}("");
        require(ok, "withdraw failed");
    }
}
