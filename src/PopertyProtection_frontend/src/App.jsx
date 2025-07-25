import { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import './app.css';
import { backend, agent } from './lib/api';

function App() {
  const [activeTab, setActiveTab] = useState('register');
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [verificationResult, setVerificationResult] = useState('');
  const [registrationDetails, setRegistrationDetails] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [transferStatus, setTransferStatus] = useState('');

  useEffect(() => {
    const initializeBackend = async () => {
      try {
        // Add loading state
        setRegistrationStatus('Connecting to backend...');
        
        if (process.env.NODE_ENV !== "production") {
          await agent.fetchRootKey().catch(console.error);
        }
        
        // Test connection with a simple call
        await backend.caller();
        setRegistrationStatus('Connected to backend');
        await fetchRegistrationDetails();
      } catch (error) {
        console.error("Failed to initialize backend:", error);
        setRegistrationStatus('Failed to connect to the backend. Please make sure the local replica is running.');
      }
    };

    initializeBackend();
  }, []);
  // ... existing functions ...
  const calculateFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const hash = await calculateFileHash(file);
      setFileHash(hash);
    }
  };

  async function handleRegistration(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const additionalMetadata = JSON.parse(formData.get('additionalMetadata') || '{}');
      const metadata = {
        category: formData.get('category'),
        creationDate: new Date().toISOString(),
        status: formData.get('initialStatus'),
        ...additionalMetadata
      };

      await backend.register_ip(
        formData.get('title'),
        formData.get('description'),
        fileHash,
        formData.get('licenseType'),
        metadata
      );
      setRegistrationStatus('Successfully registered IP!');
      fetchRegistrationDetails();
    } catch (error) {
      setRegistrationStatus('Failed to register IP: ' + error.message);
    }
  }

  async function handleVerification(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const ownerPrincipal = Principal.fromText(formData.get('owner'));
      const result = await backend.verify_ownership(
        ownerPrincipal,
        formData.get('verifyFileHash')
      );
      setVerificationResult(result ? 'Ownership verified!' : 'Ownership not verified.');
    } catch (error) {
      setVerificationResult('Verification failed: ' + error.message);
    }
  }

  async function handleTransferOwnership(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const newOwner = Principal.fromText(formData.get('newOwner'));
      await backend.transfer_ownership(fileHash, newOwner);
      setTransferStatus('Successfully transferred ownership!');
      fetchRegistrationDetails();
      fetchTransferHistory(fileHash);
    } catch (error) {
      setTransferStatus('Failed to transfer ownership: ' + error.message);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    try {
      const results = await backend.search_registrations(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  async function fetchTransferHistory(hash) {
    try {
      const history = await backend.get_transfer_history(hash);
      setTransferHistory(history);
    } catch (error) {
      console.error('Failed to fetch transfer history:', error);
    }
  }

  async function updateStatus(status) {
    try {
      await backend.update_registration_status(fileHash, status);
      fetchRegistrationDetails();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async function fetchRegistrationDetails() {
    try {
      const details = await backend.get_ip_registration(
        await backend.caller()
      );
      setRegistrationDetails(details);
    } catch (error) {
      console.error('Failed to fetch registration details:', error);
    }
  }

  useEffect(() => {
    fetchRegistrationDetails();
  }, []);

  return (
    <>
      <header className="hero-section">
        <nav className="tabs">
          <div className="protab">
            <div
              onClick={() => {
                setActiveTab('hero');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ cursor: 'pointer' }}
            >
              PatentPro
            </div>
          </div>
          <div className='navButtons'>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''} nav-link nav-link-ltr`}
              onClick={() => {
                setActiveTab('register');
                document.querySelector('.register-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Register IP
            </button>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''} nav-link nav-link-ltr`}
              onClick={() => {
                setActiveTab('verify');
                document.querySelector('.verify-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Verify Ownership
            </button>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''} nav-link nav-link-ltr`}
              onClick={() => {
                setActiveTab('manage');
                document.querySelector('.manage-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Manage IP
            </button>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''} nav-link nav-link-ltr`}
              onClick={() => {
                setActiveTab('search');
                document.querySelector('.search-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Search
            </button>
          </div>
        </nav>

        <div className="hero-content">
          <div className='left'>
            <h1 className="hero-description">
              Secure your intellectual property on the blockchain. Register, verify, and manage your digital assets with confidence.
            </h1>

          </div>
          <div className="right"><div className="hero-cta">
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-label">Decentralized</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">Secure</span>
                <span className="stat-label">Blockchain</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">Simple</span>
                <span className="stat-label">Management</span>
              </div>
            </div>
            <button className="primary-btn" onClick={() => setActiveTab('register')}>
              Register Your IP
            </button>
            <button className="secondary-btn" onClick={() => setActiveTab('search')}>
              Explore Registry
            </button>
          </div></div>
        </div>
        <div className="hero-background">
          <div className="gradient-overlay"></div>
          <div className="pattern-overlay"></div>
        </div>
      </header>

      <main>
        <div className="content-container">
          {activeTab === 'register' && (
            <section className="register-section">
              <h2>Register New IP</h2>
              <div className="section-description">
                <p>Protect your intellectual property by registering it on the blockchain.</p>
              </div>
              <form onSubmit={handleRegistration} className="registration-form">
                <div className="form-group">
                  <label htmlFor="title">Title:</label>
                  <input id="title" name="title" type="text" required placeholder="Enter IP title" />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description:</label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    placeholder="Describe your intellectual property"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="file">Upload File:</label>
                  <input
                    id="file"
                    name="file"
                    type="file"
                    onChange={handleFileChange}
                    required
                  />
                  {fileHash && (
                    <div className="hash-display">
                      <p>File Hash: {fileHash}</p>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="licenseType">License Type:</label>
                  <select id="licenseType" name="licenseType" required>
                    <option value="">Select License Type</option>
                    <option value="MIT">MIT License</option>
                    <option value="GPL">GNU General Public License</option>
                    <option value="Apache">Apache License 2.0</option>
                    <option value="Creative Commons">Creative Commons</option>
                    <option value="Custom">Custom License</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category:</label>
                  <select id="category" name="category" required>
                    <option value="">Select Category</option>
                    <option value="art">Art</option>
                    <option value="music">Music</option>
                    <option value="literature">Literature</option>
                    <option value="software">Software</option>
                    <option value="patent">Patent</option>
                    <option value="trademark">Trademark</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="initialStatus">Initial Status:</label>
                  <select id="initialStatus" name="initialStatus" required>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="additionalMetadata">Additional Metadata (JSON):</label>
                  <textarea
                    id="additionalMetadata"
                    name="additionalMetadata"
                    placeholder="Enter additional metadata in JSON format"
                  />
                </div>

                <button type="submit" className="submit-btn">Register IP</button>
              </form>
              {registrationStatus && (
                <div className={`status-message ${registrationStatus.includes('Failed') ? 'error' : 'success'}`}>
                  {registrationStatus}
                </div>
              )}
            </section>
          )}

          {activeTab === 'verify' && (
            <section className="verify-section">
              <h2>Verify Ownership</h2>
              <div className="section-description">
                <p>Verify the ownership of any registered intellectual property.</p>
              </div>
              <form onSubmit={handleVerification} className="verification-form">
                <div className="form-group">
                  <label htmlFor="owner">Owner Principal ID:</label>
                  <input
                    id="owner"
                    name="owner"
                    type="text"
                    required
                    placeholder="Enter owner's Principal ID"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="verifyFileHash">File Hash:</label>
                  <input
                    id="verifyFileHash"
                    name="verifyFileHash"
                    type="text"
                    required
                    placeholder="Enter file hash to verify"
                  />
                </div>

                <button type="submit" className="submit-btn">Verify Ownership</button>
              </form>
              {verificationResult && (
                <div className={`status-message ${verificationResult.includes('not') ? 'error' : 'success'}`}>
                  {verificationResult}
                </div>
              )}
            </section>
          )}

          {activeTab === 'manage' && (
            <section className="manage-section">
              <h2>Manage IP</h2>
              <div className="section-description">
                <p>Transfer ownership and manage the status of your intellectual property.</p>
              </div>
              <form onSubmit={handleTransferOwnership} className="transfer-form">
                <div className="form-group">
                  <label htmlFor="newOwner">New Owner Principal ID:</label>
                  <input
                    id="newOwner"
                    name="newOwner"
                    type="text"
                    required
                    placeholder="Enter new owner's Principal ID"
                  />
                </div>
                <button type="submit" className="submit-btn">Transfer Ownership</button>
              </form>
              {transferStatus && (
                <div className={`status-message ${transferStatus.includes('Failed') ? 'error' : 'success'}`}>
                  {transferStatus}
                </div>
              )}

              <div className="status-controls">
                <h3>Update Status</h3>
                <div className="button-group">
                  <button onClick={() => updateStatus('Active')} className="status-btn active">
                    Set Active
                  </button>
                  <button onClick={() => updateStatus('Expired')} className="status-btn expired">
                    Set Expired
                  </button>
                </div>
              </div>

              {transferHistory.length > 0 && (
                <div className="transfer-history">
                  <h3>Transfer History</h3>
                  {transferHistory.map((record, index) => (
                    <div key={index} className="transfer-record">
                      <p><strong>From:</strong> {record.from.toString()}</p>
                      <p><strong>To:</strong> {record.to.toString()}</p>
                      <p><strong>Date:</strong> {new Date(Number(record.timestamp) / 1000000).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'search' && (
            <section className="search-section">
              <h2>Search IP Registrations</h2>
              <div className="section-description">
                <p>Explore the registry of intellectual property registrations.</p>
              </div>
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-bar">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, description, or license type..."
                  />
                  <button type="submit" className="search-btn">Search</button>
                </div>
              </form>

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((result, index) => (
                    <div key={index} className="ip-record">
                      <h3>{result.title}</h3>
                      <p><strong>Description:</strong> {result.description}</p>
                      <p><strong>License:</strong> {result.license_type}</p>
                      <p><strong>Status:</strong> {result.status}</p>
                      <p><strong>Owner:</strong> {result.owner.toString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {registrationDetails && (
          <section className="registration-details">
            <h2>Your IP Registrations</h2>
            <div className="registration-card">
              <div className="card-header">
                <h3>{registrationDetails.title}</h3>
                <span className={`status-badge ${registrationDetails.status.toLowerCase()}`}>
                  {registrationDetails.status}
                </span>
              </div>
              <div className="card-content">
                <p><strong>Description:</strong> {registrationDetails.description}</p>
                <p><strong>License:</strong> {registrationDetails.license_type}</p>
                <p><strong>Registration Date:</strong> {new Date(Number(registrationDetails.timestamp) / 1000000).toLocaleString()}</p>
                <p className="hash-text"><strong>File Hash:</strong> {registrationDetails.file_hash}</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2024 Decentralized IP Registry. Powered by Internet Computer.</p>
      </footer>
    </>
  );
}

export default App;