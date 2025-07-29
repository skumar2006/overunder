import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Image,
  Dimensions
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Bet, getTimeLeft } from '../data/mockBets';

interface BetModalProps {
  visible: boolean;
  bet: Bet | null;
  selectedSide: 'yes' | 'no' | null;
  onClose: () => void;
  onPlaceBet: (amount: number, side: 'yes' | 'no') => void;
}

const { width } = Dimensions.get('window');

export const BetModal: React.FC<BetModalProps> = ({ 
  visible, 
  bet, 
  selectedSide, 
  onClose, 
  onPlaceBet 
}) => {
  const [betAmount, setBetAmount] = useState(1);

  if (!bet || !selectedSide) return null;

  const selectedPrice = selectedSide === 'yes' ? bet.yesPrice : bet.noPrice;
  const chance = Math.round(selectedPrice * 100);
  const payout = betAmount / selectedPrice;

  const handlePlaceBet = () => {
    onPlaceBet(betAmount, selectedSide);
    onClose();
  };

  const handleSideChange = (side: 'yes' | 'no') => {
    // This would typically update the parent component's selectedSide
    // For now, we'll just close and let the parent handle it
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {/* Profile and Question */}
          <View style={styles.header}>
            <View style={styles.profileContainer}>
              <Image source={{ uri: bet.picture }} style={styles.profilePic} />
              {bet.category === 'relationships' && (
                <View style={styles.heartOverlay}>
                  <Text style={styles.heartIcon}>❤️</Text>
                </View>
              )}
            </View>
            <View style={styles.questionContainer}>
              <Text style={styles.question}>{bet.name}</Text>
              <Text style={styles.bettingText}>
                You are betting <Text style={styles.boldText}>{selectedSide === 'yes' ? 'Yes' : 'No'}</Text>
              </Text>
            </View>
          </View>

          {/* Yes/No Buttons */}
          <View style={styles.betButtons}>
            <TouchableOpacity 
              style={[
                styles.yesButton, 
                selectedSide === 'yes' && styles.selectedButton
              ]}
              onPress={() => handleSideChange('yes')}
            >
              <Text style={[
                styles.yesButtonText,
                selectedSide === 'yes' && styles.selectedButtonText
              ]}>Yes</Text>
              <Text style={[
                styles.priceText,
                selectedSide === 'yes' && styles.selectedButtonText
              ]}>${bet.yesPrice.toFixed(2)}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.noButton,
                selectedSide === 'no' && styles.selectedButton
              ]}
              onPress={() => handleSideChange('no')}
            >
              <Text style={[
                styles.noButtonText,
                selectedSide === 'no' && styles.selectedButtonText
              ]}>No</Text>
              <Text style={[
                styles.priceText,
                selectedSide === 'no' && styles.selectedButtonText
              ]}>${bet.noPrice.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>

          {/* Chance */}
          <Text style={styles.chanceText}>{chance}% chance</Text>

          {/* Amount Slider */}
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Enter Amount</Text>
            <Text style={styles.sliderValue}>${betAmount}</Text>
            
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={500}
                value={betAmount}
                onValueChange={setBetAmount}
                step={1}
                minimumTrackTintColor="#333"
                maximumTrackTintColor="#ccc"
                thumbStyle={styles.sliderThumb}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>$0</Text>
                <Text style={styles.sliderLabelText}>$500</Text>
              </View>
              
              {/* $10 marker */}
              <View style={[styles.sliderMarker, { left: (10 / 500) * (width - 80) + 20 }]}>
                <Text style={styles.sliderMarkerText}>$10</Text>
              </View>
            </View>
          </View>

          {/* Payout */}
          <Text style={styles.payoutText}>
            If {selectedSide === 'yes' ? 'Yes' : 'No'}, your payout will be{' '}
            <Text style={styles.payoutAmount}>${payout.toFixed(0)}</Text>
          </Text>

          {/* Place Bet Button */}
          <TouchableOpacity style={styles.placeBetButton} onPress={handlePlaceBet}>
            <Text style={styles.placeBetText}>Place Your Bet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width - 40,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 10,
  },
  profileContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ddd',
  },
  heartOverlay: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  heartIcon: {
    fontSize: 16,
  },
  questionContainer: {
    flex: 1,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bettingText: {
    fontSize: 14,
    color: '#666',
  },
  boldText: {
    fontWeight: '600',
    color: '#333',
  },
  betButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  yesButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedButton: {
    backgroundColor: '#333',
  },
  yesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedButtonText: {
    color: '#fff',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  chanceText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  sliderContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 16,
  },
  sliderWrapper: {
    position: 'relative',
  },
  slider: {
    width: '100%',
    height: 20,
  },
  sliderThumb: {
    backgroundColor: '#333',
    width: 20,
    height: 20,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabelText: {
    fontSize: 12,
    color: '#666',
  },
  sliderMarker: {
    position: 'absolute',
    top: -25,
    alignItems: 'center',
  },
  sliderMarkerText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  payoutText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  payoutAmount: {
    fontWeight: 'bold',
    color: '#333',
  },
  placeBetButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  placeBetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
}); 