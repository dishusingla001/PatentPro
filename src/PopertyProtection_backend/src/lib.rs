use candid::{CandidType, Principal};
use ic_cdk::{update, query};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, 
    StableBTreeMap, 
    BoundedStorable,
    Storable,
};
use std::cell::RefCell;
use std::borrow::Cow;

#[derive(CandidType, Deserialize, Serialize, Clone)]
struct IPRegistration {
    owner: PrincipalWrapper,
    title: String,
    description: String,
    timestamp: u64,
    file_hash: String,
    license_type: String,
    metadata: HashMap<String, String>,
    transfer_history: Vec<TransferRecord>,
    status: RegistrationStatus,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
struct TransferRecord {
    from: PrincipalWrapper,
    to: PrincipalWrapper,
    timestamp: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, PartialEq)]
enum RegistrationStatus {
    Active,
    Transferred,
    Expired,
}

// Newtype wrapper for Principal
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct PrincipalWrapper(Principal);

// Implement Storable for PrincipalWrapper
impl Storable for PrincipalWrapper {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        PrincipalWrapper(Principal::from_slice(&bytes))
    }
}

// Implement BoundedStorable for PrincipalWrapper
impl BoundedStorable for PrincipalWrapper {
    const MAX_SIZE: u32 = 29; // Standard Principal size
    const IS_FIXED_SIZE: bool = true;
}


// Implement Storable for IPRegistration
impl Storable for IPRegistration {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
}

// Implement BoundedStorable for IPRegistration
impl BoundedStorable for IPRegistration {
    const MAX_SIZE: u32 = 1024;
    const IS_FIXED_SIZE: bool = false;
}

thread_local! {
    static REGISTRY: RefCell<StableBTreeMap<PrincipalWrapper, IPRegistration, VirtualMemory<DefaultMemoryImpl>>> = 
        RefCell::new(StableBTreeMap::init(
            MemoryManager::init(DefaultMemoryImpl::default())
                .get(MemoryId::new(0))
        ));
}

#[update]
fn transfer_ownership(file_hash: String, new_owner: Principal) -> Result<(), String> {
    let caller = ic_cdk::api::caller();
    let timestamp = ic_cdk::api::time();

    REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        
        if let Some(mut registration) = registry.get(&PrincipalWrapper(caller)) {
            if registration.file_hash != file_hash {
                return Err("You don't own this IP".to_string());
            }
            
            let transfer_record = TransferRecord {
                from: PrincipalWrapper(caller),
                to: PrincipalWrapper(new_owner),
                timestamp,
            };
            
            registration.transfer_history.push(transfer_record);
            registration.owner = PrincipalWrapper(new_owner);
            registration.status = RegistrationStatus::Transferred;
            
            registry.remove(&PrincipalWrapper(caller));
            registry.insert(PrincipalWrapper(new_owner), registration);
            Ok(())
        } else {
            Err("IP registration not found".to_string())
        }
    })
}

#[query]
fn search_registrations(query: String) -> Vec<IPRegistration> {
    let query = query.to_lowercase();
    REGISTRY.with(|registry| {
        registry
            .borrow()
            .iter()
            .filter(|(_, registration)| {
                registration.title.to_lowercase().contains(&query) ||
                registration.description.to_lowercase().contains(&query) ||
                registration.license_type.to_lowercase().contains(&query)
            })
            .map(|(_, registration)| registration)
            .collect()
    })
}

#[query]
fn get_transfer_history(file_hash: String) -> Result<Vec<TransferRecord>, String> {
    REGISTRY.with(|registry| {
        registry
            .borrow()
            .iter()
            .find(|(_, reg)| reg.file_hash == file_hash)
            .map(|(_, reg)| reg.transfer_history)
            .ok_or_else(|| "IP registration not found".to_string())
    })
}

#[update]
fn update_registration_status(file_hash: String, status: RegistrationStatus) -> Result<(), String> {
    let caller = ic_cdk::api::caller();
    
    REGISTRY.with(|registry| {
        let mut registry = registry.borrow_mut();
        
        if let Some(mut registration) = registry.get(&PrincipalWrapper(caller)) {
            if registration.file_hash != file_hash {
                return Err("You don't own this IP".to_string());
            }
            
            registration.status = status;
            registry.insert(PrincipalWrapper(caller), registration);
            Ok(())
        } else {
            Err("IP registration not found".to_string())
        }
    })
}

#[update]
fn register_ip(
    title: String,
    description: String,
    file_hash: String,
    license_type: String,
    metadata: HashMap<String, String>,
) -> Result<(), String> {
    let caller = ic_cdk::api::caller();
    let timestamp = ic_cdk::api::time();

    let registration = IPRegistration {
        owner: PrincipalWrapper(caller),
        title,
        description,
        timestamp,
        file_hash,
        license_type,
        metadata,
        transfer_history: Vec::new(), // Initialize with empty vector
        status: RegistrationStatus::Active // Initialize with Active status
    };

    REGISTRY.with(|registry| {
        registry.borrow_mut().insert(PrincipalWrapper(caller), registration);
    });

    Ok(())
}

#[query]
fn get_ip_registration(owner: Principal) -> Option<IPRegistration> {
    REGISTRY.with(|registry| registry.borrow().get(&PrincipalWrapper(owner)))
}

#[query]
fn verify_ownership(owner: Principal, file_hash: String) -> bool {
    REGISTRY.with(|registry| {
        registry
            .borrow()
            .get(&PrincipalWrapper(owner))
            .map_or(false, |reg| reg.file_hash == file_hash)
    })
}



// For Candid interface generation
candid::export_service!();

#[ic_cdk::init]
fn init() {
    // Optional initialization logic
}