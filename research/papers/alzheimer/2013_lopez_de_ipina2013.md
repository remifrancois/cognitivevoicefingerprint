# Lopez et al. (2013) — Full Text Extraction

**Source file:** 2013_lopez_de_ipina2013.pdf
**Pages:** 19
**Extracted by:** MemoVoice research pipeline (PyMuPDF)

---

## Full Paper Content

Academic Editor: Waleed Abdulla
Received: 13 November 2025
Revised: 19 December 2025
Accepted: 4 January 2026
Published: 8 January 2026
Copyright: © 2026 by the authors.
Licensee MDPI, Basel, Switzerland.
This article is an open access article
distributed under the terms and
conditions of the Creative Commons
Attribution (CC BY) license.
Article
A Machine Learning Framework for Cognitive Impairment
Screening from Speech with Multimodal Large Models
Shiyu Chen 1,†, Ying Tan 1,†, Wenyu Hu 2, Yingxi Chen 3, Lihua Chen 1, Yurou He 1, Weihua Yu 3,*
and Yang Lü 1,*
1
Laboratory of Research and Translation for Geriatric Diseases, Department of Geriatrics, The First Affiliated
Hospital of Chongqing Medical University, Youyi Road, Yuzhong District, Chongqing 400016, China;
2023140102@stu.cqmu.edu.cn (S.C.); taryn_pjt@163.com (Y.T.); 2020110153@stu.cqmu.edu.cn (L.C.);
2023110047@stu.cqmu.edu.cn (Y.H.)
2
Tianfu Jiangxi Laboratory, Chengdu 641400, China; hwyuestc@gmail.com
3
Institute of Neuroscience, Chongqing Medical University, Chongqing 400016, China;
chenyingxicqmu@163.com
*
Correspondence: yuweihua@cqmu.edu.cn (W.Y.); yanglyu@hospital.cqmu.edu.cn (Y.L.);
Tel.: +86-23-89011632 (Y.L.); Fax: +86-23-68811487 (Y.L.)
†
These authors contributed equally to this work.
Abstract
Background: Early diagnosis of Alzheimer’s disease (AD) is essential for slowing disease
progression and mitigating cognitive decline. However, conventional diagnostic methods
are often invasive, time-consuming, and costly, limiting their utility in large-scale screen-
ing. There is an urgent need for scalable, non-invasive, and accessible screening tools.
Methods: We propose a novel screening framework combining a pre-trained multimodal
large language model with structured MMSE speech tasks. An artificial intelligence-assisted
multilingual Mini-Mental State Examination system (AAM-MMSE) was utilized to collect
voice data from 1098 participants in Sichuan and Chongqing. CosyVoice2 was used to
extract speaker embeddings, speech labels, and acoustic features, which were converted
into statistical representations. Fourteen machine learning models were developed for
subject classification into three diagnostic categories: Healthy Control (HC), Mild Cognitive
Impairment (MCI), and Alzheimer’s Disease (AD). SHAP analysis was employed to assess
the importance of the extracted speech features. Results: Among the evaluated models,
LightGBM and Gradient Boosting classifiers exhibited the highest performance, achieving
an average AUC of 0.9501 across classification tasks. SHAP-based analysis revealed that
spectral complexity, energy dynamics, and temporal features were the most influential in
distinguishing cognitive states, aligning with known speech impairments in early-stage
AD. Conclusions: This framework offers a non-invasive, interpretable, and scalable solu-
tion for cognitive screening. It is suitable for both clinical and telemedicine applications,
demonstrating the potential of speech-based AI models in early AD detection.
Keywords: Alzheimer’s disease; digital biomarkers; acoustic feature extraction; machine
learning; early diagnosis
1. Introduction
As the global population ages, dementia has become a pressing public health issue,
significantly affecting the physical and mental well-being of elderly [1]. Among dementia
types, Alzheimer’s disease (AD) is the most common, accounting for 60% to 80% of all
cases [2]. AD is a progressive neurodegenerative disorder primarily affecting individuals
Bioengineering 2026, 13, 73
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
2 of 19
over 65 years old, marked by symptoms such as memory loss, language impairment, ex-
ecutive dysfunction, spatial disorientation, and changes in personality and behavior [3].
Language dysfunction, a hallmark of AD, involves deficits in both motor control of speech
production and higher-level cognitive functions like language planning, semantic organiza-
tion, and logical reasoning [3,4].
The onset of AD is typically preceded by an intermediate stage known as mild cogni-
tive impairment (MCI), particularly the amnestic subtype (aMCI), which is regarded as a
potential prodromal phase of AD [5]. Early identification of MCI is clinically significant
for delaying cognitive decline, developing intervention strategies, and prolonging quality-
adjusted life years [6]. However, diagnosing AD and MCI remains challenging due to their
subtle onset and slow progression. While neuroimaging and biomarker such as PET scans
and cerebrospinal fluid assays provide insight into AD pathology, their high cost, complex-
ity, and limited accessibility restrict their routine use [7,8]. In contrast, neuropsychological
scales such as the Mini-Mental State Examination (MMSE) offer advantages of simplicity
and low cost, making them the mainstream tools for cognitive assessment [9,10]. However,
these methods’ diagnostic accuracy is affected by factors like evaluator expertise, resource
demands, and demographics such as education. Additionally, a ceiling effect limits their
use across diverse populations [11–13].
Recently, speech has emerged as a natural, non-invasive, cost-effective, and easily
collectible digital biomarker showing remarkable potential for early detection of cogni-
tive impairment [14]. Studies have documented multiple speech abnormalities in AD
patients, such as imprecise articulation, slowed speech rate, irregular rhythm, monotonous
pitch, and increased pausing [15–17]. These changes arise not only from motor system
degeneration but also from diminished cognitive resources leading to impaired language
organization [18]. Such anomalies can be quantified via audio signal processing techniques
across multiple dimensions, including speech rate, pause ratio, spectral energy distribution,
voice perturbation parameters, spectral contrast, and entropy, laying the foundation for con-
structing acoustically sensitive cognitive biomarkers [19,20]. Consequently, speech analysis
has become an increasingly important research direction for intelligent cognitive screening.
Although early studies suggest speech signals can help detect cognitive impairments,
current methods still struggle with feature modeling, algorithm robustness, and clinical
interpretability. CosyVoice2 embeddings offer high-dimensional representations of speech
that encode a broad range of acoustic and temporal information potentially related to
cognitive status. Conventional low-dimensional handcrafted features, including MFCCs,
pitch, and formant-based measures, have been widely used in prior speech-based cognitive
studies; however, their performance may vary across datasets and clinical settings. In the
present study, we therefore focus on exploring the utility of large-scale learned speech
representations within a unified classification framework, without aiming to provide a
direct empirical comparison with traditional acoustic features [21,22]. While these features
capture certain vocal characteristics, they are limited in their ability to represent the complex
cognitive processes underlying language organization and semantic production [23,24].
Most existing studies that use speech to assess cognitive impairment are based on limited
sample sizes or rely primarily on cohorts from Western populations [25]. These models
typically perform well only in monolingual or standard-accent environments and lack
generalizability to dialectal or multilingual settings [26]. Furthermore, the lack of stan-
dardized speech tasks leads to heterogeneity across studies, weakening the link between
speech features and clinical assessments such as MMSE and MoCA, and reducing model
interpretability and clinical utility [27].
To address these challenges, this study proposes a novel speech-based screening
framework for Alzheimer’s disease that integrates high-dimensional embedded speech
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
3 of 19
feature extraction using a pre-trained large language model with multiple machine learning
algorithms for classification. A standardized Mini-Mental State Examination speech cor-
pus was collected from participants in Sichuan and Chongqing, comprising three groups:
healthy controls (HC), individuals with MCI, and patients with AD. For the first time in
this context, the speech feature extraction module of the pre-trained large language model
CosyVoice2 was first utilized. The high-dimensional speaker embeddings, speech tokens,
and acoustic representations extracted by CosyVoice2 were subsequently transformed into
interpretable statistical acoustic parameters, including Num frames, Mean energy, Std
energy, Max energy, Energy range, Skew energy etc. These features preserve traditional
acoustic characteristics while enhancing the representation of temporal structure and cog-
nitive load, resulting in an acoustic feature space with improved cross-linguistic robustness
and cognitive sensitivity.
In classification modeling, fourteen widely used classifiers such as SVM, KNN, Ran-
dom Forest, XGBoost, LightGBM, Gradient Boosting, and logistic regression were sys-
tematically evaluated on a three-class classification task (HC versus MCI versus AD),
employing five-fold cross-validation to ensure model robustness. The experimental results
demonstrate that multiple algorithms achieve excellent performance in key metrics such
as AUC and F1-score, with LightGBM and Gradient Boosting models reaching an average
three-class AUC of 0.9501, significantly outperforming baseline models based on traditional
low-dimensional acoustic features.
This study addresses limitations in current speech-based cognitive screening meth-
ods, including low feature interpretability, poor model generalizability, and suboptimal
evaluation strategies. It proposes a novel modeling framework leveraging acoustic embed-
dings derived from large language models. Specifically, the CosyVoice2 feature extraction
module is employed to capture high-dimensional acoustic-cognitive features from Sichuan
dialect speech. These features are integrated with multiple machine learning models to
classify healthy controls (HC), mild cognitive impairment (MCI), and Alzheimer’s dis-
ease (AD), leading to enhanced interpretability and cross-task adaptability. Overall, this
work advances the current speech-based cognitive screening paradigm and provides a
methodological foundation for the interdisciplinary integration of language neuroscience
and artificial intelligence.
2. Methods
2.1. Study Participants
From 1 January 2023 to 31 December 2024, a total of 1098 patients from the Memory
Clinic of the Geriatrics Department at the First Affiliated Hospital of Chongqing Medical
University were screened and enrolled in this study. All participants underwent compre-
hensive medical history assessments, routine blood tests, neuropsychological evaluations,
and structural magnetic resonance imaging (sMRI). The diagnosis of Alzheimer’s disease
(AD) was based on the 2011 revised criteria for probable AD dementia established by
the National Institute on Aging and the Alzheimer’s Association (NIA/AA). The diagno-
sis of mild cognitive impairment (MCI) followed the corresponding NIA/AA diagnostic
guidelines [28]. None of the participants had a history of mental illness or prior use of
cognitive-enhancing medications.
2.2. Ethical Considerations
This study and its informed consent were approved by medical ethics Chongqing First
Affiliated Hospital Committee Medical University (Approval number: 20212901; Time of
Ethical Approval: 10 May 2021). All participants or theirs. The legal guardian signs the
informed consent upon receipt a detailed description of this study.
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
4 of 19
2.3. Automated Multilingual Cognitive Assessment and Speech-Based Classification Pipeline
To reduce the clinical manpower demands and enhance the scalability of cognitive
screening, this study implemented an artificial intelligence-assisted multilingual Mini-
Mental State Examination system (AAM-MMSE). As shown in Figure 1, the system enabled
patients to independently complete standardized cognitive assessment tasks through
human–computer voice interaction, without requiring real-time supervision by medical
professionals. During the assessment, patients receive voice prompts for MMSE questions
via a computer interface and respond verbally. The system’s built-in automatic speech
recognition (ASR) module records and transcribes responses in real time, facilitating a
full automated assessment process. This approach ensure consistent administration and
minimized reliance on clinical resources. Following the AAM-MMSE interaction, all
recorded speech data were processed using the CosyVoice2 acoustic feature extraction
module [29]. High-dimensional, frame-level acoustic embedding features were extracted
from each patient’s audio responses. To generate a fixed-length, compact representation for
each individual, we applied the Statistical Embedding Aggregation method, calculating
statistical descriptors such as the mean and standard deviation across all frame-level
features. These feature vectors were subsequently input into machine learning models to
classify participants into one of three cognitive categories: cognitively normal (HC), mild
cognitive impairment (MCI), or Alzheimer’s disease (AD).
Figure 1. Automated Multilingual Cognitive Assessment and Speech-Based Classification Pipeline.
2.4. Speech Data Collection
Previous speech data collection protocols often used the “cookie theft” picture de-
scription tasks, which required participants to generate free-form speech based on image
content [30,31]. However, this method imposed significant demands on language orga-
nization and comprehension, making it difficult for individuals with moderate to severe
cognitive impairments to participate effectively. Consequently, the quality of the speech
data varied widely. Moreover, traditional methods typically required healthcare staff to
manually operate recording devices, increasing operational workload and introducing
potential artifacts such as incomplete recordings and background noise.
In this study, we utilized our self-developed AAM-MMSE system during participants’
initial clinical visits [32]. The system enabled automatic and real-time collection of complete
verbal responses during the formal administration of the MMSE. As a widely used clinical
tool for cognitive assessment, the MMSE includes a set of standardized language tasks such
as orientation, immediate recall, attention, language comprehension, repetition, and nam-
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
5 of 19
ing. These tasks allow for efficient acquisition of clinically meaningful speech data without
imposing additional cognitive or procedural burden on participants. All MMSE speech
recordings were collected under the supervision of trained clinical personnel, and no audio
files were missing at the acquisition stage. Quality control was therefore performed at the
signal level rather than the file level. Recordings or segments exhibiting excessive noise or
severe signal degradation that prevented reliable feature extraction were excluded during
preprocessing. Mild background noise was attenuated using Deep Complex CRN (avail-
able at: https://github.com/huyanxin/DeepComplexCRN (accessed on 12 June 2025)),
recordings were resampled to 16 kHz, and a 32-ms Hann window with 50% overlap was
applied during short-time Fourier transform. The dataset includes 10–12 recordings per
participant from multiple MMSE subtests, providing a reproducible basis for subsequent
acoustic analyses. It should be noted that DeepComplexCRN was used exclusively as an
explicit offline denoising step to suppress environmental background noise prior to feature
extraction. In contrast, CosyVoice2 was not employed as a denoising algorithm per se, but
as a representation model whose learned embeddings are inherently robust to residual
noise and speaker interference.
2.5. Feature Extraction and Speaker Identification Using the CosyVoice2 Audio Module
Feature extraction and speaker identification were conducted using the audio feature
extraction module of CosyVoice2 (Figure 2), a large-scale pre-trained speech model devel-
oped by Alibaba Tongyi Laboratory [29]. CosyVoice2 is primarily designed for high-fidelity,
low-latency, multilingual text-to-speech (TTS) applications and is currently considered one
of the most advanced speech generation models available [33]. Trained on a large-scale
multilingual speech corpus, this module supports speaker identification and effectively
isolates the target speaker by suppressing background noise and interfering voices. Notably,
CosyVoice2 exhibits strong performance in understanding and processing regional dialects,
particularly Sichuanese, with a semantic comprehension capability surpassing that of other
large language models.
In this study, preprocessed MMSE audio recordings were input into the CosyVoice2
speech analysis module, which automatically extracted a set of high-dimensional speaker
embeddings. Importantly, the acoustic descriptors used for classification were not con-
ventional handcrafted features extracted directly from raw waveforms. Instead, they
were statistical summaries computed from high-dimensional CosyVoice2 embeddings,
and therefore represent embedding-derived acoustic features rather than traditional low-
dimensional handcrafted descriptors such as MFCCs or formants. These embeddings
encoded personalized speech characteristics and cognitive language features of each partic-
ipant. In addition, conventional acoustic features were extracted, including Num frames,
Mean energy, Std energy, Max energy, Energy range, Skew energy, etc.
Given the variable duration of individual recordings, the resulting speech features
were of unequal lengths, posing challenges for model fitting and potentially compromising
classification performance. To address this, statistical summarization was applied to all
extracted features, transforming them into fixed-length, interpretable acoustic descriptors.
These standardized features were then labeled according to the participants’ cognitive
states, including HC, MCI and AD.
The speech features were extracted across several key dimensions, including mean
energy (representing the average energy of the speech signal, indicative of overall vo-
cal intensity), power sum (reflecting the total energy over time, corresponding to cu-
mulative vocal output during the recording), and speaking ratio (the proportion of
time the participant was actively speaking, used to quantify speech activity relative to
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
6 of 19
pauses or silence). A comprehensive summary of all extracted features is presented in
Supplementary Material Table S1.
 
Figure 2. Schematic of the CosyVoice2 model architecture, with the speech feature extraction module
isolated and applied in the present study.
This figure illustrates the workflow of acoustic feature extraction utilizing the pre-
trained CosyVoice2 large language model. Raw audio recordings are initially fed into the
CosyVoice2 speech analysis module, which performs automatic speaker identification and
dialect recognition. Subsequently, high-dimensional speaker embeddings and acoustic
features—Num frames, Mean energy, Std energy, Max energy, Energy range, Skew energy,
etc.—are extracted. These features are then standardized and used as input for downstream
machine learning tasks.
2.6. Establishment and Validation of Machine Learning Models
Participants were randomly assigned to a training set and an independent test set in a
6:4 ratio. Demographic characteristics are summarized in Supplementary Material Table S2.
The training set was used for feature selection, model construction, and hyperparameter
optimization, while the test set was reserved solely for independent performance evalua-
tion. Class imbalance is a common challenge in clinical datasets and may adversely affect
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
7 of 19
model performance, particularly for minority diagnostic groups. To mitigate this issue, the
Synthetic Minority Over sampling Technique was applied to the training data using the im-
balanced learn library in Python to improve class balance during model development [34].
To ensure a strict separation between training and evaluation procedures, oversampling
was confined to the training data only. The dataset was initially divided into training and
test sets without oversampling. Model development was conducted exclusively within
the training set using stratified fivefold cross validation. In each fold, SMOTE was applied
only to the training subset, whereas the validation subset remained unchanged. Follow-
ing model selection and hyperparameter tuning, each classifier was retrained using the
full training set without oversampling. Final model performance was evaluated on the
independent test set to obtain an unbiased estimate of generalization performance.
In this study, Bayesian optimization was used to search the hyperparameters of
14 commonly employed supervised learning algorithms for classifying participants into
HC, MCI, and AD groups [35]. The search ranges for key hyperparameters were defined
based on prior literature and practical considerations. It should be emphasized that the
aim of this study was not to establish generalizable rules or systematic patterns for optimal
hyperparameter configurations, but to identify parameter settings that are relatively stable
and well suited to the present dataset. A more in-depth investigation of the underlying
behavior and regularities of hyperparameters is therefore beyond the scope of this work
and will be pursued in future studies. All optimization procedures used balanced accuracy
as the objective function and were strictly confined to the training subset within each cross-
validation fold, thereby ensuring that validation data were not accessed during the tuning
process. The evaluated classifiers included Logistic Regression (LR) [36], Random Forest
(RF) [37], Extra Trees [38], Gradient Boosting [39], AdaBoost [40], k-Nearest Neighbors
(k-NN) [41], Decision Tree [42], Support Vector Machine (SVM) [43], Naïve Bayes [44],
Linear Discriminant Analysis (LDA) [45], Quadratic Discriminant Analysis (QDA) [46], eX-
treme Gradient Boosting (XGBoost) [47], Light Gradient Boosting Machine (LightGBM) [48],
and the Dummy classifier [49] as a baseline reference.
All models were implemented using the scikit-learn (sklearn) library in Python. Model
performance was comprehensively assessed using standard classification metrics, including
precision, recall, F1-score, and the area under the receiver operating characteristic curve
(AUC). A schematic overview of the entire modeling pipeline is presented in Figure 3.
2.7. Feature Importance Assessment
To improve model interpretability and clarify how each feature contributes to the
classification results, we applied the SHapley Additive Explanations (SHAP) method based
on game theory [50]. SHAP assigns a positive or negative contribution value to each feature
for every prediction, explaining individual outcomes. This value reflects how the expected
model output changes when the feature is included. Using the TreeExplainer module, we
calculated precise SHAP values for the gradient boosting decision tree model. Visualization
of the top features ranked by absolute mean SHAP values showed that specific acoustic
features such as spectral entropy, energy change difference and speaking ratio have different
contributions to predictions across the classes.
2.8. Statistical Analysis Environment
All statistical analysis and computations were conducted using SPSS version 26 and
Python Version 3.6.2. Categorical variables were expressed as frequency (percentage).
The continuous variables conforming to the normal distribution were expressed as the
mean ± standard deviation and the other not conforming to normal distribution were
presented as median (interquartile range). Differences with p-value < 0.05 were considered
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
8 of 19
statistically significant. Bootstrap resampling was used solely to estimate the uncertainty
of performance metrics and to derive confidence intervals, and it was not used for model
selection, hyperparameter tuning, or statistical hypothesis testing.
Figure 3. Flowchart of the proposed framework, comprising two main phases: data acquisition and
pre-processing, and construction and evaluation of the classification model.
3. Results
3.1. Patient Characteristics
Between 1 January 2023 and 31 December 2024, a total of 1485 patients were screened
for inclusion in this study. Of these, 60 patients with other medical conditions and 115 pa-
tients with unknown diagnoses were excluded during the initial screening. An additional
104 patients were excluded due to inability or refusal to complete the full cognitive assess-
ment or MRI examination. Furthermore, 108 patients were excluded because excessive
noise in their voice recordings prevented the extraction of reliable acoustic features. Ulti-
mately, 1098 patients met the inclusion criteria and were enrolled in this study. A detailed
overview of the patient enrollment process is presented in Figure 4. Table 1 summarizes
the clinical and sociodemographic characteristics of the sample used in this study.
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
9 of 19
Figure 4. Flow diagram for patients’ enrollment.
Table 1. Participants’ demographic characteristics.
Variable
Total
N = 1098
HC
N = 179
MCI
N = 470
AD
N = 449
p-Value
Age
73.56 (11.6)
73.00 (13)
74.00 (11)
73.00 (10)
0.573 a
Female, N (%)
738 (67.213)
119 (66.48)
307 (65.31)
312 (69.49)
0.394 b
Education, (y)
8.62 (6.222)
9.000 (6.0)
9.000 (6.3)
9.000 (6.0)
0.632 a
MMSE
26.05 (12.52)
28.00 (2)
22.00 (12)
19.00 (15)
<0.001 a*
ADAS-Cog
13.0574 (17.4433)
8.300 (5.9)
15.315 (16.08)
18.7100 (26.03)
<0.001 a*
Data are presented as median (interquartile range); a, Kruskal–Wallis test; b, the chi-square test; *, p < 0.05.
Abbreviation: HC healthy controls, MCI mild cognitive impairment, AD Alzheimer’s disease, MMSE Mini-mental
State Examination, ADAS-Cog Alzheimer’s Disease Assessment Scale-Cognitive section.
3.2. Mel-Spectrogram and Spectral Analysis of Patient Speech
Figure 5A–C display the Mel-spectrograms and corresponding spectral graphs for
participants in the healthy control group, those with mild cognitive impairment, and
patients diagnosed with Alzheimer’s disease, respectively.
The Mel-spectrogram provides a time–frequency representation of the speech sig-
nal, highlighting energy distribution across Mel-scaled frequency bands. In Figure 5,
comparative Mel-spectrograms are shown for healthy controls, MCI patients, and AD
patients. Notably, AD patients exhibit sparse energy bands, irregular formant structures,
and increased silence intervals, indicating reduced phonation consistency and impaired
articulation. The corresponding spectral graphs illustrate the signal’s power spectral den-
sity. Compared to healthy controls, MCI and AD subjects show diminished spectral energy,
particularly in the mid- to high-frequency ranges, reflecting weakened vocal strength and
reduced clarity.
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
10 of 19
Figure 5. Mel spectrograms and spectral plots of speech samples from (A) healthy controls, (B) indi-
viduals with mild cognitive impairment (MCI), and (C) patients with Alzheimer’s disease (AD).
3.3. Performance Evaluation of Classification Models
To evaluate the effectiveness of various models in distinguishing between healthy
controls, patients with mild cognitive impairment, and those with Alzheimer’s disease,
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
11 of 19
we employed multiple performance metrics, including precision, recall, F1 score, and the
area under the receiver operating characteristic curve. A total of 14 classification algorithms
were assessed, ranging from conventional linear models to advanced ensemble learning
techniques. Detailed summaries of the performance indicators for all model training and
test sets can be found in Supplementary Material Tables S3 and S4, while Figure 6 presents
the confusion matrices of each classifier for the test sets.
Figure 6. Confusion matrices of 14 classification models on the validation set. The models include:
Gradient Boosting (A), Light Gradient Boosting Machine (LightGBM) (B), AdaBoost (C), eXtreme
Gradient Boosting (XGBoost) (D), Random Forest (E), Extra Trees (F), Support Vector Machine
(SVM) (G), Logistic Regression (LR) (H), Linear Discriminant Analysis (LDA) (I), k-Nearest Neighbors
(KNN) (J), Naive Bayes (K), Decision Tree (L), Quadratic Discriminant Analysis (QDA) (M), and
Dummy Classifier (N). Classification labels: 0—Healthy Control (HC), 1—Mild Cognitive Impairment
(MCI), 2—Alzheimer’s Disease (AD).
Among all tested models, Gradient Boosting (Figure 6A) and LightGBM (Figure 6B)
exhibited the best overall performance. Gradient Boosting achieved the highest F1 score
(0.837) and AUC (0.950), followed closely by LightGBM (F1 score: 0.816; AUC: 0.950).
AdaBoost (Figure 6C) also demonstrated robust generalization capabilities, achieving an F1
score of 0.841 and an AUC of 0.926. Additionally, XGBoost (Figure 6D), Random Forest
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
12 of 19
(Figure 6E) and ExtraTrees (Figure 6F) performed competitively, with AUC values of 0.945,
0.937 and 0.927, respectively.
In contrast, simpler models such as Support Vector Machine (Figure 6G), Logistic
Regression (Figure 6H) and Linear Discriminant Analysis (Figure 6I) yielded moderate
classification performance, with AUCs ranging from 0.87 to 0.90. K-Nearest Neighbors
(Figure 6J), Naive Bayes (Figure 6K) and Decision Tree (Figure 6L) demonstrated rela-
tively lower predictive accuracy and stability. Notably, Quadratic Discriminant Analysis
(Figure 6M) and the Dummy (Figure 6N) classifier exhibited poor predictive performance,
with AUCs of 0.579 and 0.500, respectively, indicating limited clinical utility in this context.
3.4. Feature Importance Analysis
To investigate the interpretability of model predictions across different cognitive states,
we examined feature importance within the LightGBM and Gradient Boosting classifiers,
focusing on their performance in distinguishing healthy controls (class 1), mild cognitive
impairment (class 2), and Alzheimer’s disease (class 3).
Class-specific SHAP analyses derived from the LightGBM model revealed distinct
feature patterns corresponding to HC, MCI and AD groups. For HC (Figure 7A), higher
values of spectral entropy mean, delta2 mean, skew energy, and spectral contrast mean
were the most predictive, indicating that cognitively healthy individuals tend to produce
speech with higher spectral complexity, smoother energy distributions, and more struc-
tured spectral variation. Additionally, num frames, reflecting the total duration of spoken
responses, contributed prominently, suggesting greater speech completeness and fluency
in healthy subjects.
Figure 7. The importance of feature in optimized. (A) In the healthy controls group (class1). the
SHAP values of each feature in the LightGBM model. (B) In the MCI group (class 2), the SHAP values
of each feature in the LightGBM model. (C) In the AD group (class 3), the SHAP values of each
feature in the LightGBM model. (D) Average SHAP value of each feature in the GradientBoosting.
In the MCI group (Figure 7B), the model assigned greater importance to features
indicative of disrupted vocal regularity and reduced spectral coherence. Variables such
as spectral flatness std, spectral entropy mean, and spectral contrast std played key roles,
reflecting increased noise components and weakened harmonic contrast. Furthermore,
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
13 of 19
energy-based features including power ratio, kurtosis energy, std energy, and mean energy
were found to be influential, potentially capturing the reduced vocal expressiveness and
energetic variability associated with mild cognitive deterioration.
In the AD group (Figure 7C), the model places greater emphasis on acoustic indicators
that reflect changes in temporal structure and energy characteristics during speech produc-
tion. Features such as frame count, mean energy, and mean energy difference exhibited high
importance in the SHAP analysis, indicating that speech duration and energy dynamics
play a critical role in the model’s identification of this category, which may correspond
to individuals with AD. In addition, energy-related features such as power ratio, energy
standard deviation, and energy kurtosis showed notable influence, potentially reflecting
reduced speech expressiveness and diminished energy control in patients with MCI and
AD. Moreover, the model remains sensitive to spectral features, including the standard
deviation of spectral entropy and the mean spectral flatness, suggesting a trend toward
decreased spectral coherence and increased noise components during speech. Overall, the
model tends to prioritize key parameters that reveal impairments in speech regulation and
increased spectral complexity.
The complementary results from the Gradient Boosting model supported the findings
from SHAP analysis (Figure 7D). The global feature importance ranking identified num
frames and mean energy as the most discriminative features across the three-class classifi-
cation task. These variables capture both the temporal length and vocal intensity of the
utterances, reflecting macro-level speech production capacity. Other highly ranked features
included power ratio, skew energy, and spectral contrast mean, alongside several dynamic
descriptors such as delta std, delta2 mean, and delta2 std, all of which contribute to the
model’s sensitivity to temporal fluctuations and phonatory control. The prominence of
both static and dynamic acoustic parameters reinforces the notion that speech production is
deeply intertwined with cognitive integrity, and that multidimensional vocal signals offer
rich diagnostic information across the cognitive continuum.
4. Discussion
This study focuses on the intelligent identification of AD and MCI by developing a
high-dimensional feature modeling and multi-algorithm classification framework based on
a standardized MMSE speech task. This study utilized Mandarin MMSE speech recordings
collected from the Sichuan-Chongqing region, encompassing three cohorts: HC, MCI,
and AD patients. All speech samples underwent standardized preprocessing and manual
annotation to ensure corpus quality and task consistency.
This work pioneers the integration of the pre-trained large language model CosyVoice2
into the AD speech recognition pipeline. Leveraging its self-supervised speaker embed-
ding mechanism, high-dimensional frame-level speech representations (1024-dimensional
vectors) were extracted to replace traditional low-dimensional handcrafted features such as
MFCC, pitch, and speech rate. To mitigate the computational burden and reduce the risk of
overfitting associated with directly modeling high-dimensional embeddings, we applied a
statistical dimensionality reduction strategy. Specifically, various summary statistics such
as mean, standard deviation, skewness, kurtosis, and the first and second derivatives were
computed over the embedding sequences to generate interpretable feature vectors with
reduced dimensionality. This approach preserves the semantic, cognitive, and speaker-
related information encoded in deep speech embeddings while enhancing downstream
model stability, controllability, and generalizability under limited sample conditions. We
systematically evaluated the classification performance of 14 mainstream machine learning
algorithms, including support vector machines, random forest, XGBoost, LightGBM, gradi-
ent boosting, k-nearest neighbors, and logistic regression. Five-fold cross-validation was
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
14 of 19
used to compare their performance on the three-class classification task involving healthy
controls, mild cognitive impairment, and Alzheimer’s disease. The Gradient Boosting
and LightGBM models achieved high overall discrimination (AUC up to 0.95) despite F1
scores below 0.85, reflecting class imbalance and reduced sensitivity for the minority class.
SHAP analyses of LightGBM highlighted features largely consistent with prior studies:
HC exhibited higher spectral complexity and smoother energy distributions, MCI showed
disrupted vocal regularity and reduced spectral coherence, and AD presented temporal
and energy-related speech changes. Gradient Boosting analyses supported these patterns,
with frame count and mean energy among the most discriminative features. Notably,
less-studied features such as spectral contrast variability and pause ratio dynamics also
contributed strongly, suggesting potential novel acoustic markers for cognitive decline.
These findings reinforce known patterns while indicating new directions for speech-based
cognitive assessment.
In recent years, speech has gained increasing attention as a non-invasive, low-cost,
easily collectable, and reproducible digital biomarker for early screening of AD and MCI,
drawing interest from both cognitive neuroscience and artificial intelligence communi-
ties [6,25,26,51]. Existing approaches primarily rely on low-dimensional handcrafted acous-
tic features, such as Mel-frequency cepstral coefficients, speech rate, fundamental frequency,
and pause duration, in combination with classical classifiers such as support vector ma-
chines and random forest to model cognitive states [52–54]. For instance, Luz et al. devel-
oped SVM models based on rhythm and prosody features to identify AD individuals [55];
Martinc et al. incorporated MFCC and word embedding features within a multimodal fu-
sion framework using RF classifiers [56]; Farrús et al. employed perturbation features such
as jitter and shimmer to characterize speech differences between AD and HC groups [57].
To further characterize model behavior, we examined misclassification patterns using
confusion matrices from the test set. Across multiple classifiers, MCI samples were the
most frequently misclassified, often being assigned to either HC or AD. This pattern aligns
with the clinical continuum of cognitive decline and indicates that boundary distinctions
between adjacent categories remain challenging for automated models. Our results help
explain why the multimodal speech representations improved model performance. The
CosyVoice2 embeddings capture spectral, temporal, and prosodic cues that reflect cogni-
tive processes, offering a more comprehensive description of speech than conventional
handcrafted features. By integrating these complementary sources of information, the
models can detect subtle abnormalities that may be missed by low-dimensional features
alone, which likely accounts for the consistent performance gains across classifiers. Al-
though these studies provide valuable insights for speech-based screening, they commonly
suffer from several limitations: feature dimensionality remains low, limiting the capture
of complex language behavior changes induced by cognitive impairment; models lack
systematic semantic and speaker characteristic modeling, resulting in poor generalizability
to non-standard language environments; moreover, heterogeneous evaluation metrics and
task settings hinder comparability and reproducibility across studies.
To address these challenges, the present study introduces key innovations in feature
modeling, algorithm integration, and task standardization. CosyVoice2 is a pre-trained
large language model developed by Alibaba for text-to-speech and speech generation
tasks [29]. It demonstrates strong capabilities in speaker disentanglement and semantic
modeling. The model shows high adaptability in the context of the Sichuan dialect, ef-
fectively identifying and capturing subtle and complex variations in language behavior.
Compared to traditional handcrafted acoustic metrics, its high-dimensional embeddings
provide more abstract and cognition-sensitive representations without requiring explicit
feature engineering. We simplified the extracted high-dimensional feature sequences into
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
15 of 19
interpretable and structurally concise features that are compatible with various machine
learning models, including SVM, gradient boosting, Decision Trees and LightGBM. This “se-
mantic embedding plus statistical modeling” fusion strategy enhances model generalization
across languages and populations, demonstrating improved stability under small-sample
conditions. Lastly, leveraging a standardized MMSE speech task and a systematic compara-
tive evaluation framework, this study establishes a replicable and scalable technical pipeline
with benchmark metrics for future speech-assisted cognitive impairment screening.
Despite promising advances in both methodological approach and classification per-
formance, several limitations remain. Our study has several practical implications for
clinical application. The proposed speech-based assessment framework could be inte-
grated into routine cognitive screening workflows, allowing non-specialist staff to collect
and analyze speech samples with minimal disruption to clinical operations. However,
deploying the framework in real-world clinical settings may face challenges, including
limited computational resources for processing high-dimensional embeddings, variability
in recording equipment, and the influence of environmental noise. Potential biases may
also arise from differences in participant demographics such as age, education, or language
dialect, as well as heterogeneous recording conditions across sites. Implementing standard-
ized recording protocols, robust model calibration, and external validation across diverse
populations will be essential to ensure reliable and generalizable performance in practical
clinical environments. The trained models are geographically and linguistically constrained
by the Sichuan-Chongqing data, necessitating further validation across multilingual and
multi-regional cohorts. Additionally, clinical cognitive labels based on neuropsychological
scale scores may be subject to subjective assessment bias, warranting incorporation of objec-
tive biomarkers such as neuroimaging or biofluid indicators in future annotation schemes.
Furthermore, this study has yet to integrate multimodal physiological data, leaving room
for improvement in modeling the complexity of cognitive function.
Future work will include a systematic comparison between CosyVoice2 embeddings
and conventional handcrafted acoustic features, such as MFCCs, pitch, and formant-related
measures, using the same classification framework. This analysis will help clarify the
relative contributions of learned speech representations and downstream classifiers. We
also plan to explore feature fusion strategies to assess potential complementarity between
learned and traditional acoustic features. We will focus on enhancing the reliability and
applicability of our approach. This includes robustness testing under varied recording
conditions, evaluating generalizability across independent multi-center datasets, and vali-
dating the framework in real-world clinical settings to assess feasibility, workflow integra-
tion, and practical utility. These steps aim to ensure consistent and reliable performance in
diverse real-world conditions. Furthermore, prospective validation in multicenter clinical
settings is essential to translate this research-driven approach into practical clinical decision
support systems.
5. Conclusions
In conclusion, this study proposes a robust and scalable framework for Alzheimer’s
disease screening that addresses key limitations of existing methods, including poor dialect
adaptability and low feature expressiveness. By combining high-dimensional acoustic
embeddings from pre-trained language models with structured language tasks, the ap-
proach effectively captures cognitive speech impairments across diverse dialects. The
results support its potential as a non-invasive digital biomarker for early detection and
broad clinical application.
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
16 of 19
Supplementary Materials:
The following supporting information can be downloaded at:
https://www.mdpi.com/article/10.3390/bioengineering13010073/s1. Table S1. Overview and
explanation of extracted speech features. Table S2. Demographic characteristics of the training set and
the test set. Table S3. Performance evaluation table of Machine learning model in train set. Table S4.
Performance evaluation table of Machine learning model in test set. Table S5. Mapping of clinical
constructs to extracted speech features. References [26,58–61] are cited in supplementary materials.
Author Contributions: S.C., W.Y. and Y.L. designed this study. S.C. and Y.T. collected the data and
wrote this paper. W.Y. and Y.L. revised the manuscript. S.C., W.H., Y.C., L.C. and Y.H. analyzed data
and assisted with writing this article. All authors have read and agreed to the published version of
the manuscript.
Funding: This study was supported by the grants from Chongqing Talent Plan (cstc2022ycjh-
bgzxm0184), Key Project of Technological Innovation and Application Development of Chongqing
Science & Technology Bureau (CSTC2021jscx-gksbN0020), Science Innovation Programs Led by
the Academicians in Chongqing under Project (cstc2020yszx-jscxX0006, 2022YSZXJSX0002CSTB),
Program for Youth Innovation in Future Medicine, Chongqing Medical University (W0166), National
Key R&D Program of China (2020YFC2004200), Chongqing Medical Key Discipline and Regional
Medical Key Discipline Development Project 0201[2022] No. 144 202325, and STI2030-Major Projects
(No. 2021ZD0201802).
Institutional Review Board Statement: Ethical approval for this study was obtained from the Medical
Ethics Committee of the First Affiliated Hospital of Chongqing Medical University (Approval No.
20212901; 10 May 2021). Written informed consent was obtained from all participants prior to their
inclusion in this study.
Informed Consent Statement: Informed consent was obtained from all subjects involved in
this study.
Data Availability Statement: The datasets generated and/or analyzed during the current study
are not publicly available due to the presence of sensitive personal data, but are available from the
corresponding authors upon reasonable request.
Acknowledgments: The authors thank all participants for their invaluable contribution to this study.
During the preparation of this work, the authors used ChatGPT (version 4.0) in order to improve the
language. After using this tool, the authors reviewed and edited the content as needed and take full
responsibility for the content of this publication.
Conflicts of Interest: The authors declare no conflicts of interest.
References
1.
Better, M.A. Alzheimer’s disease facts and figures. Alzheimer’s Dement. 2024, 20, 3708–3821. [CrossRef]
2.
Ssonko, M.; Hardy, A.; Naganathan, V.; Kalula, S.; Combrinck, M. Dementia subtypes, cognitive decline and survival among
older adults attending a memory clinic in Cape Town. South Africa: A retrospective study. BMC Geriatr. 2023, 23, 829. [CrossRef]
[PubMed]
3.
Scheltens, P.; De Strooper, B.; Kivipelto, M.; Holstege, H.; Chételat, G.; Teunissen, C.E.; Cummings, J.; Van Der Flier, W.M.
Alzheimer’s disease. Lancet 2021, 397, 1577–1590. [CrossRef]
4.
Graff-Radford, J.; Yong, K.X.X.; Apostolova, L.G.; Bouwman, F.H.; Carrillo, M.; Dickerson, B.C.; Rabinovici, G.D.; Schott, J.M.;
Jones, D.T.; Murray, M.E. New insights into atypical Alzheimer’s disease in the era of biomarkers. Lancet Neurol. 2021, 20, 222–234.
[CrossRef]
5.
Anderson, N.D. State of the science on mild cognitive impairment (MCI). CNS Spectr. 2019, 24, 78–87. [CrossRef]
6.
Monfared, A.A.T.; Phan, N.T.N.; Pearson, I.; Mauskopf, J.; Cho, M.; Zhang, Q.; Hampel, H. A Systematic Review of Clinical
Practice Guidelines for Alzheimer’s Disease and Strategies for Future Advancements. Neurol. Ther. 2023, 12, 1257–1284. [CrossRef]
7.
Xie, Q.; Ni, M.; Gao, F.; Dai, L.-B.; Lv, X.-Y.; Zhang, Y.-F.; Shi, Q.; Zhu, X.-X.; Xie, J.-K.; Shen, Y.; et al. Correlation between
Cerebrospinal Fluid Core Alzheimer’s Disease Biomarkers and β-Amyloid PET in Chinese Dementia Population. ACS Chem.
Neurosci. 2022, 13, 1558–1565. [CrossRef]
8.
Kumar, A.P.; Singh, N.; Nair, D.; Justin, A. Neuronal PET tracers for Alzheimer’s disease. Biochem. Biophys. Res. Commun. 2022,
587, 58–62. [CrossRef]
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
17 of 19
9.
Chapman, K.R.; Bing-Canar, H.; Alosco, M.L.; Steinberg, E.G.; Martin, B.; Chaisson, C.; Kowall, N.; Tripodis, Y.; Stern, R.A. Mini
Mental State Examination and Logical Memory scores for entry into Alzheimer’s disease trials. Alzheimer’s Res. Therapy 2016, 8, 9.
[CrossRef]
10.
Wang, G.; Initiative, F.T.A.D.N.; Estrella, A.; Hakim, O.; Milazzo, P.; Patel, S.; Pintagro, C.; Li, D.; Zhao, R.; Vance, D.E.; et al.
Mini-Mental State Examination and Montreal Cognitive Assessment as Tools for Following Cognitive Changes in Alzheimer’s
Disease Neuroimaging Initiative Participants. J. Alzheimer’s Dis. 2022, 90, 263–270. [CrossRef]
11.
Jia, X.; Wang, Z.; Huang, F.; Su, C.; Du, W.; Jiang, H.; Wang, H.; Wang, J.; Wang, F.; Su, W.; et al. A comparison of the Mini-Mental
State Examination (MMSE) with the Montreal Cognitive Assessment (MoCA) for mild cognitive impairment screening in Chinese
middle-aged and older population: A cross-sectional study. BMC Psychiatry 2021, 21, 485. [CrossRef] [PubMed]
12.
Li, H.; Jia, J.; Yang, Z. Mini-Mental State Examination in Elderly Chinese: A Population-Based Normative Study. J. Alzheimer’s Dis.
2016, 53, 487–496. [CrossRef] [PubMed]
13.
Jannati, A.; Toro-Serey, C.; Gomes-Osman, J.; Banks, R.; Ciesla, M.; Showalter, J.; Bates, D.; Tobyne, S.; Pascual-Leone, A. Digital
Clock and Recall is superior to the Mini-Mental State Examination for the detection of mild cognitive impairment and mild
dementia. Alzheimer’s Res. Therapy 2024, 16, 2. [CrossRef] [PubMed]
14.
Cay, G.; Pfeifer, V.A.; Lee, M.; Rouzi, M.D.; Nunes, A.S.; El-Refaei, N.; Momin, A.S.; Atique, M.M.U.; Mehl, M.R.; Vaziri, A.; et al.
Harnessing Speech-Derived Digital Biomarkers to Detect and Quantify Cognitive Decline Severity in Older Adults. Gerontology
2024, 70, 429–438. [CrossRef]
15.
Amini, S.; Hao, B.; Zhang, L.; Song, M.; Gupta, A.; Karjadi, C.; Kolachalama, V.B.; Au, R.; Paschalidis, I.C. Automated detection of
mild cognitive impairment and dementia from voice recordings: A natural language processing approach. Alzheimer’s Dement.
2023, 19, 946–955. [CrossRef]
16.
Cho, S.; Olm, C.A.; Ash, S.; Shellikeri, S.; Agmon, G.; Cousins, K.A.Q.; Irwin, D.J.; Grossman, M.; Liberman, M.; Nevler, N.
Automatic classification of AD pathology in FTD phenotypes using natural speech. Alzheimer’s Dement. 2024, 20, 3416–3428.
[CrossRef]
17.
König, A.; Linz, N.; Baykara, E.; Tröger, J.; Ritchie, C.; Saunders, S.; Teipel, S.; Köhler, S.; Sánchez-Benavides, G.; Grau-Rivera, O.;
et al. Screening over Speech in Unselected Populations for Clinical Trials in AD (PROSPECT-AD): Study Design and Protocol.
J. Prev. Alzheimer’s Dis. 2023, 10, 314–321. [CrossRef]
18.
Pistono, A.; Senoussi, M.; Guerrier, L.; Rafiq, M.; Giméno, M.; Péran, P.; Jucla, M.; Pariente, J. Language Network Connectivity
Increases in Early Alzheimer’s Disease. J. Alzheimer’s Dis. 2021, 82, 447–460. [CrossRef]
19.
Thomas, J.A.; Burkhardt, H.A.; Chaudhry, S.; Ngo, A.D.; Sharma, S.; Zhang, L.; Au, R.; Ghomi, R.H. Assessing the Utility of
Language and Voice Biomarkers to Predict Cognitive Impairment in the Framingham Heart Study Cognitive Aging Cohort Data.
J. Alzheimers Dis. 2020, 76, 905–922. [CrossRef]
20.
Tavabi, N.; Stück, D.; Signorini, A.; Karjadi, C.; Al Hanai, T.; Sandoval, M.; Lemke, C.; Glass, J.; Hardy, S.; Lavallee, M.; et al.
Cognitive Digital Biomarkers from Automated Transcription of Spoken Language. J. Prev. Alzheimer’s Dis. 2022, 9, 791–800.
[CrossRef]
21.
Cheng, O.; Dines, J.; Doss, M.M. A Generalized Dynamic Composition Algorithm of Weighted Finite State Transducers for Large
Vocabulary Speech Recognition. In Proceedings of the 2007 IEEE International Conference on Acoustics, Speech and Signal
Processing—ICASSP’07, Honolulu, HI, USA, 16–20 April 2007; IEEE: New York, NY, USA, 2007; pp. IV-345–IV-348. [CrossRef]
22.
Davis, S.; Mermelstein, P. Comparison of parametric representations for monosyllabic word recognition in continuously spoken
sentences. IEEE Trans. Acoust. Speech Signal Process. 1980, 28, 357–366. [CrossRef]
23.
Hilger, A.I.; Cole, J.; Larson, C. Semantic focus mediates pitch auditory feedback control in phrasal prosody. Lang. Cogn. Neurosci.
2023, 38, 328–345. [CrossRef] [PubMed]
24.
Alhanai, T.; Au, R.; Glass, J. Spoken language biomarkers for detecting cognitive impairment. In Proceedings of the 2017 IEEE
Automatic Speech Recognition and Understanding Workshop (ASRU), Okinawa, Japan, 16–20 December 2017; IEEE: New York,
NY, USA, 2017; pp. 409–416. [CrossRef]
25.
Shankar, R.; Bundele, A.; Mukhopadhyay, A. A Systematic Review of Natural Language Processing Techniques for Early Detection
of Cognitive Impairment. Mayo Clin. Proc. Digit. Health 2025, 3, 100205. [CrossRef] [PubMed]
26.
Saeedi, S.; Hetjens, S.; Grimm, M.O.W.; Latoszek, B.B.V. Acoustic Speech Analysis in Alzheimer’s Disease: A Systematic Review
and Meta-Analysis. J. Prev. Alzheimer’s Dis. 2024, 11, 1789–1797. [CrossRef]
27.
Chen, Y.; Hartsuiker, R.; Pistono, A. A comparison of different connected-speech tasks for detecting mild cognitive impairment
using multivariate pattern analysis. Aphasiology 2024, 39, 476–499. [CrossRef]
28.
Jack, C.R.; Bennett, D.A.; Blennow, K.; Carrillo, M.C.; Dunn, B.; Haeberlein, S.B.; Holtzman, D.M.; Jagust, W.; Jessen, F.; Karlawish,
J.; et al. NIA-AA Research Framework: Toward a biological definition of Alzheimer’s disease. Alzheimer’s Dement. 2018,
14, 535–562. [CrossRef]
29.
Du, Z.; Wang, Y.; Chen, Q.; Shi, X.; Lv, X.; Zhao, T.; Gao, Z.; Yang, Y.; Gao, C.; Wang, H.; et al. CosyVoice 2: Scalable Streaming
Speech Synthesis with Large Language Models. arXiv 2024, arXiv:2412.10117. [CrossRef]
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
18 of 19
30.
Agbavor, F.; Liang, H. Artificial Intelligence-Enabled End-To-End Detection and Assessment of Alzheimer’s Disease Using Voice.
Brain Sci. 2022, 13, 28. [CrossRef]
31.
García-Gutiérrez, F.; Alegret, M.; Marquié, M.; Muñoz, N.; Ortega, G.; Cano, A.; De Rojas, I.; García-González, P.; Olivé, C.;
Puerta, R.; et al. Unveiling the sound of the cognitive status: Machine Learning-based speech analysis in the Alzheimer’s disease
spectrum. Alzheimer’s Res. Ther. 2024, 16, 26. [CrossRef]
32.
Chen, L.; Zhang, M.; Yu, W.; Yu, J.; Cui, Q.; Chen, C.; Liu, J.; Huang, L.; Liu, J.; Yu, W.; et al. A Fully Automated Mini-Mental State
Examination Assessment Model Using Computer Algorithms for Cognitive Screening. J. Alzheimer’s Dis. 2024, 97, 1661–1672.
[CrossRef]
33.
Sheng, Z.; Du, Z.; Zhang, S.; Yan, Z.; Yang, Y.; Ling, Z. SyncSpeech: Low-Latency and Efficient Dual-Stream Text-to-Speech based
on Temporal Masked Transformer. arXiv 2025, arXiv:2502.11094. [CrossRef]
34.
Chawla, N.V.; Bowyer, K.W.; Hall, L.O.; Kegelmeyer, W.P. SMOTE: Synthetic Minority Over-sampling Technique. J. Artif. Intell.
Res. 2002, 16, 321–357. [CrossRef]
35.
Norris, D.; McQueen, J.M.; Cutler, A. Prediction, Bayesian inference and feedback in speech recognition. Lang. Cogn. Neurosci.
2016, 31, 4–18. [CrossRef] [PubMed]
36.
Schober, P.; Vetter, T.R. Logistic Regression in Medical Research. Anesth. Analg. 2021, 132, 365–366. [CrossRef]
37.
Hu, J.; Szymczak, S. A review on longitudinal data analysis with random forest. Brief. Bioinform. 2023, 24, bbad002. [CrossRef]
38.
Geurts, P.; Ernst, D.; Wehenkel, L. Extremely randomized trees. Mach. Learn. 2006, 63, 3–42. [CrossRef]
39.
Ke, G.; Meng, Q.; Finley, T.; Wang, T.; Chen, W.; Ma, W.; Ye, T.; Liu, Y. LightGBM: A Highly Efficient Gradient Boosting Decision
Tree. Adv. Neural Inf. Process. Syst. 2017, 30, 52.
40.
Drucker, H. Improving Regressors using Boosting Techniques. Icml 1997, 97, e115.
41.
Hall, P.; Park, B.U.; Samworth, R.J. Choice of neighbor order in nearest-neighbor classification. Ann. Statist. 2008, 36, 2135–2152.
[CrossRef]
42.
Lemon, S.C.; Roy, J.; Clark, M.A.; Friedmann, P.D.; Rakowski, W. Classification and regression tree analysis in public health:
Methodological review and comparison with logistic regression. Ann. Behav. Med. 2003, 26, 172–181. [CrossRef]
43.
Zhang, F.; Petersen, M.; Johnson, L.; Hall, J.; O’Bryant, S.E. Recursive Support Vector Machine Biomarker Selection for Alzheimer’s
Disease. J. Alzheimer’s Dis. 2021, 79, 1691–1700. [CrossRef] [PubMed]
44.
Cichosz, P. Data Mining Algorithms: Explained Using R, 1st ed.; Wiley: Hoboken, NJ, USA, 2015. [CrossRef]
45.
Lin, W.; Gao, Q.; Du, M.; Chen, W.; Tong, T. Multiclass diagnosis of stages of Alzheimer’s disease using linear discriminant
analysis scoring for multimodal data. Comput. Biol. Med. 2021, 134, 104478. [CrossRef] [PubMed]
46.
Odom-Maryon, T.; Langholz, B.; Niland, J.; Azen, S. Generalization of normal discriminant analysis using fourier series density
estimators. Stat. Med. 1991, 10, 473–485. [CrossRef] [PubMed]
47.
Zhang, Y.; Shen, S.; Li, X.; Wang, S.; Xiao, Z.; Cheng, J.; Li, R. A multiclass extreme gradient boosting model for evaluation of
transcriptomic biomarkers in Alzheimer’s disease prediction. Neurosci. Lett. 2024, 821, 137609. [CrossRef]
48.
Franciotti, R.; Nardini, D.; Russo, M.; Onofrj, M.; Sensi, S.L. Comparison of Machine Learning-based Approaches to Predict the
Conversion to Alzheimer’s Disease from Mild Cognitive Impairment. Neuroscience 2023, 514, 143–152. [CrossRef]
49.
Pedregosa, F.; Varoquaux, G.; Gramfort, A.; Michel, V.; Thirion, B.; Grisel, O.; Blondel, M.; Müller, A.; Nothman, J.; Louppe, G.;
et al. Scikit-learn: Machine Learning in Python. J. Mach. Learn. Res. 2012, 12, 2825–2830. [CrossRef]
50.
Vimbi, V.; Shaffi, N.; Mahmud, M. Interpreting artificial intelligence models: A systematic review on the application of LIME and
SHAP in Alzheimer’s disease detection. Brain Inf. 2024, 11, 10. [CrossRef]
51.
Yamada, Y.; Shinkawa, K.; Nemoto, M.; Nemoto, K.; Arai, T. A mobile application using automatic speech analysis for classifying
Alzheimer’s disease and mild cognitive impairment. Comput. Speech Lang. 2023, 81, 101514. [CrossRef]
52.
Shanshool, M.A.; Abdulmohsin, H.A. A Comprehensive Review on Machine Learning Approaches for Enhancing Human Speech
Recognition. Trait. Signal 2023, 40, 2121–2129. [CrossRef]
53.
Sheerur, M.S.S.; Nitnaware, D.V.N. Patil School Of Engineering Academy, Emotion Speech Recognition using MFCC and SVM.
Int. J. Eng. Res. 2015, 4, IJERTV4IS060932. [CrossRef]
54.
Toth, L.; Hoffmann, I.; Gosztolya, G.; Vincze, V.; Szatloczki, G.; Banreti, Z.; Pakaski, M.; Kalman, J. A Speech Recognition-based
Solution for the Automatic Detection of Mild Cognitive Impairment from Spontaneous Speech. Curr. Alzheimer Res. 2018, 15,
130–138. [CrossRef]
55.
Haider, F.; De La Fuente, S.; Luz, S. An Assessment of Paralinguistic Acoustic Features for Detection of Alzheimer’s Dementia in
Spontaneous Speech. IEEE J. Sel. Top. Signal Process. 2020, 14, 272–281. [CrossRef]
56.
Martinc, M.; Haider, F.; Pollak, S.; Luz, S. Temporal Integration of Text Transcripts and Acoustic Features for Alzheimer’s
Diagnosis Based on Spontaneous Speech. Front. Aging Neurosci. 2021, 13, 642647. [CrossRef]
57.
Farrús, M.; Codina-Filbà, J. Combining Prosodic, Voice Quality and Lexical Features to Automatically Detect Alzheimer’s Disease.
arXiv 2020, arXiv:2011.09272. [CrossRef]
https://doi.org/10.3390/bioengineering13010073


---

Bioengineering 2026, 13, 73
19 of 19
58.
Wang, H.-L.; Tang, R.; Ren, R.-J.; Dammer, E.B.; Guo, Q.-H.; Peng, G.-P.; Cui, H.-L.; Zhang, Y.-M.; Wang, J.-T.; Xie, X.-Y.; et al.
Speech silence character as a diagnostic biomarker of early cognitive decline and its functional mechanism: A multicenter
cross-sectional cohort study. BMC Med. 2022, 20, 380. [CrossRef]
59.
Themistocleous, C.; Eckerström, M.; Kokkinakis, D. Voice quality and speech fluency distinguish individuals with Mild Cognitive
Impairment from Healthy Controls. PLoS ONE 2020, 15, e0236009. [CrossRef] [PubMed]
60.
Badal, V.D.; Reinen, J.M.; Twamley, E.W.; Lee, E.E.; Fellows, R.P.; Bilal, E.; Depp, C.A. Investigating Acoustic and Psycholinguistic
Predictors of Cognitive Impairment in Older Adults: Modeling Study. JMIR Aging 2024, 7, e54655. [CrossRef]
61.
Cho, S.; Nevler, N.; Shellikeri, S.; Parjane, N.; Irwin, D.J.; Ryant, N.; Ash, S.; Cieri, C.; Liberman, M.; Grossman, M. Lexical and
Acoustic Characteristics of Young and Older Healthy Adults. J. Speech Lang. Hear. Res. 2021, 64, 302–314. [CrossRef] [PubMed]
Disclaimer/Publisher’s Note: The statements, opinions and data contained in all publications are solely those of the individual
author(s) and contributor(s) and not of MDPI and/or the editor(s). MDPI and/or the editor(s) disclaim responsibility for any injury to
people or property resulting from any ideas, methods, instructions or products referred to in the content.
https://doi.org/10.3390/bioengineering13010073


---
*Full text extracted from PDF for MemoVoice V3 algorithm training.*
